# Media uploads — operating the S3 buckets

> **Location:** `docs/MEDIA-UPLOADS.md`
> **Audience:** whoever has to make an upload work, or work out why it stopped.
> **Last verified against code:** 2026-07-31 (commit `4ee8195`)

This is the **operational** document for media storage: the commands, the manual
setup steps, the failure modes and the things that will bite you. The
architectural view — which bucket exists, why, and how the four endpoints fit
into the platform — is [`ARCHITECTURE.md` §8.1](./ARCHITECTURE.md#81-media-buckets--upload-matrix),
and the newcomer-level summary is [root `README.md` §2.2](../README.md#22-uploads--buckets-and-endpoints).
The matrix in §1 below deliberately overlaps §8.1 in its first four columns and
then diverges: it carries the literal MIME strings, the exact key prefixes and a
second table naming **which constants file owns each rule** — what you need when
changing a limit or reading an S3 403. For anything else, follow the links.

All upload logic lives in `backend/src/modules/upload/` — `upload.controller.ts`
(routing + guards) and `upload.service.ts` (keys, conditions, presigning). The
limits are **not** defined there: each feature owns its own constants file, which
is what makes them re-validatable on submit.

> **What is and is not repo state.** Everything about *code* below is derived from
> the files named next to it. Everything about the *buckets themselves* — that
> they exist, that `csd-media` has a public-read policy, that public access is
> blocked on `csd-media-private`, that the CORS JSONs were ever applied, that no
> lifecycle rule exists — is **console state**. Neither bucket is managed by
> Serverless or by any pipeline. Marked `†` below; re-check with the command given.

---

## 1. Endpoint matrix

Four endpoints. **Three of the four are presigned POST, not PUT** — the single
most common wrong assumption about this area.

| Endpoint | Auth | S3 method | Bucket | Key prefix | Size cap | MIME allow-list |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/upload/presigned-url` | `JwtAuthGuard` + `RolesGuard` → `MANAGER`, `ADMIN` | presigned **PUT** | `csd-media` | `media/blog/` | ⚠ **none** | `image/jpeg`, `image/png`, `image/webp` |
| `POST /api/upload/testimonial-presigned` | **none** — anonymous by design | presigned **POST** | `csd-media` | `media/testimonials/` | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `POST /api/upload/needs-presigned` | `TurnstileGuard` only (**no JWT**) | presigned **POST** | `csd-media-private` | `media/needs/recovery/{photo,doc}/`<br>`media/needs/winterization/{photo,doc}/` | 5 MB photo · 15 MB doc | photos: `image/jpeg`, `image/png`, `image/webp`<br>docs: `application/pdf`, `…wordprocessingml.document`, `…spreadsheetml.sheet`, `application/zip` |
| `POST /api/upload/about-doc-presigned` | `JwtAuthGuard` + `RolesGuard` → `ADMIN`, `SUPER_ADMIN` | presigned **POST** | `csd-media-private` | `media/about/docs/<CODE>/<locale>/<version>/` | 4 MB | `application/pdf` only |

Every presigned URL expires in **300 s** (`PRESIGNED_URL_EXPIRES_IN`).

**Where each rule is actually defined** — change it here, not in `upload.service.ts`:

| Rule | Owner |
| --- | --- |
| Needs photo/document MIME + byte caps, `media/needs/recovery/` prefix, 3–10 photos, ≤5 documents | `modules/needs/recovery.constants.ts` |
| `media/needs/winterization/` prefix | `modules/needs/winterization.constants.ts` |
| `recovery \| winterization` discriminator → prefix map | `modules/needs/needs-forms.constants.ts` + `NEEDS_PREFIX_BY_FORM_TYPE` in `upload.service.ts` (a `Record<>`, so adding a form type without a prefix is a compile error) |
| About PDF cap, prefix, code/version patterns, presigned-GET TTL | `modules/about/about-documents.constants.ts` |
| Blog + testimonial MIME list, testimonial 5 MB cap | `ALLOWED_MIME_TYPES` / `TESTIMONIAL_MAX_BYTES` in `upload.service.ts` |

The needs and About endpoints return an **`s3Key`, not a URL**. The client echoes
that key back on submit, and it is re-validated server-side before anything is
persisted — so a stolen presigned URL cannot smuggle a file into another form's
namespace. Two layers, and it matters which does what:

- **The submit DTOs pin the key shape** with `@Matches`: `recovery-attachment.dto.ts`
  and `winterization-attachment.dto.ts` require the form's own
  `media/needs/<form>/` prefix and reject `..`; `create-about-document-file.dto.ts`
  uses `ABOUT_DOCUMENT_S3_KEY_PATTERN`, which also pins code, locale and version.
- **MIME and size are re-checked in the service** for the needs forms
  (`assertValidAttachments`), and at DTO level for About (`@IsIn`, `@Max`).

### Error responses you will actually see

| Symptom | Cause |
| --- | --- |
| **500** from `presigned-url` on a bad MIME | The endpoint takes an inline body type, not a DTO, so the global `ValidationPipe` never runs and the service throws `InternalServerErrorException`. Cosmetically wrong; behaviourally it does reject the file |
| **400** from the other three on a bad MIME | Rejected either by `class-validator` (`TestimonialUploadDto`, `AboutDocUploadDto` both use `@IsIn`) or by the service's `BadRequestException` (`needs-presigned`, whose DTO only checks `@IsString()`) |
| **403** from `needs-presigned` | `TurnstileGuard`. In production it fails closed when `TURNSTILE_SECRET_KEY` is unset; locally it bypasses with a warning |
| **500 "AWS_S3_PRIVATE_BUCKET is not configured"** | `assertPrivateBucketConfigured()` — see §3 |
| **400 / 403 direct from S3**, never reaching our API | The signed POST policy did its job: an oversized body trips `content-length-range` (`400 EntityTooLarge`), a mismatched declared type trips `["eq", "$Content-Type", …]` (`403 AccessDenied`). `file-upload.ts` extracts the `<Code>` from the XML body and shows it — read that code before assuming anything else |

---

## 2. Three operational facts that live nowhere else

These are properties of the current implementation, not opinions about it. Each
one has surprised somebody already.

### 2.1 `POST /api/upload/presigned-url` has no size cap at all

Not a large one —
none. A presigned **PUT** URL cannot carry a `content-length-range` condition:
the client chooses the request body and S3 has nothing signed to compare it
against. A `MANAGER` with a valid token can push an arbitrarily large object into
`media/blog/`. The only mitigation today is that the endpoint is role-guarded.
Fixing it means converting the blog flow to a presigned POST, exactly as the
other three already are.

### 2.2 `AWS_S3_MEDIA_BUCKET` defaults to `''` — and the two public flows fail differently

`this.config.get<string>('AWS_S3_MEDIA_BUCKET', '')`, and the variable is **not**
in `backend/.env.example`. Locally, both `csd-media` endpoints therefore run
against an empty bucket name — but they do **not** behave the same way. Verified
by running the repo's own `@aws-sdk` against `Bucket: ''` on 2026-07-31:

| Endpoint | Behaviour with an empty bucket name |
| --- | --- |
| `presigned-url` (PUT) | `getSignedUrl` **throws** `No value provided for input HTTP label: Bucket.` → the request fails immediately with a 500. Confusing, but loud |
| `testimonial-presigned` (POST) | `createPresignedPost` **succeeds silently**, returning the path-style URL `https://s3.eu-central-1.amazonaws.com/` with no bucket segment. Nothing fails until the browser POSTs to it and S3 answers with an error the client reports as a generic S3 failure |

The `publicUrl` returned alongside is plain string interpolation
(`https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`), so it degrades
to `https://.s3.eu-central-1.amazonaws.com/media/…` — which is what would be
persisted if an upload ever did succeed.

Production is unaffected: `serverless.yml` sets `AWS_S3_MEDIA_BUCKET: csd-media`
explicitly. Note the asymmetry with the *private* bucket, which has an explicit
guard for exactly this case (§3); the public one has none.

### 2.3 The backend IAM role has no `s3:DeleteObject`

The role carries
`s3:PutObject` on `csd-media/*` and `s3:PutObject` + `s3:GetObject` on
`csd-media-private/*` — and nothing else (`backend/serverless.yml`, `provider.iam`).
This is *why* deleting a needs form orphans its files: `RecoveryService.remove()`
and `WinterizationService.remove()` delete the `needs_form_attachments` rows and
the form row in one transaction, and the S3 objects stay. That was a deliberate
MVP compromise, not an oversight — the keys are written into
`needs_form_audit_log` as an `s3Keys` field change so a later cleanup script can
find them. Any such script needs an IAM change first. See §6.

---

## 3. The private bucket — `csd-media-private`

`csd-media-private` holds personal data: contact names, positions, phone numbers
and e-mail addresses inside defect acts and cost estimates, plus photographs of
damaged private and communal property. It must never gain a public-read policy.

It is **created and configured by hand**. Serverless only references its name:

```yaml
# backend/serverless.yml
custom:
  privateMediaBucket: ${env:AWS_S3_PRIVATE_BUCKET, 'csd-media-private'}
```

That one value feeds both the IAM resource ARN and the `AWS_S3_PRIVATE_BUCKET`
environment variable, so the two cannot drift. Note that
`AWS_S3_PRIVATE_BUCKET` is **not** in `deploy.yml`'s deploy-step `env:` block, so
production always takes the `'csd-media-private'` default regardless of what is
configured in GitHub.

### Creating it from scratch

```bash
aws s3api create-bucket --bucket csd-media-private \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1

# Public access block ON — all four flags. This is the load-bearing step.
aws s3api put-public-access-block --bucket csd-media-private \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-cors --bucket csd-media-private \
  --cors-configuration file://infra/s3-csd-media-private-cors.json
```

Do **not** attach a bucket policy. Every read is a short-lived presigned GET
signed by the backend (§5).

### The two IAM statements

```yaml
- Effect: Allow
  Action: [s3:PutObject]
  Resource: "arn:aws:s3:::csd-media/*"
- Effect: Allow
  Action: [s3:PutObject, s3:GetObject]
  Resource: "arn:aws:s3:::${self:custom.privateMediaBucket}/*"
```

`GetObject` on the private bucket is what makes the presigned GETs possible; it
also covers `HEAD`. There is no `DeleteObject` and no `ListBucket` on either.

### If the variable is missing

All four private-bucket methods call `assertPrivateBucketConfigured()` first and
throw `InternalServerErrorException('AWS_S3_PRIVATE_BUCKET is not configured — needs-form file storage is unavailable')`.
So an unset variable produces a clear 500 rather than a silent write to a
nonexistent bucket — the opposite of the public-bucket behaviour in §2.2.

---

## 4. CORS

A presigned POST sends `multipart/form-data` cross-origin, which triggers a
preflight. Without CORS the browser blocks reading the (otherwise successful,
`204 No Content`) response, and the upload appears to fail while the object is
already in the bucket.

Two committed configs, applied manually:

| File | Bucket | Methods |
| --- | --- | --- |
| [`infra/s3-csd-media-cors.json`](../infra/s3-csd-media-cors.json) | `csd-media` | `GET`, `PUT`, `POST` |
| [`infra/s3-csd-media-private-cors.json`](../infra/s3-csd-media-private-cors.json) | `csd-media-private` | `GET`, `POST` |

Both allow `http://localhost:4200`, `https://www.csd-fund.org` and
`https://csd-fund.org`, expose `ETag` + `Location`, and cache the preflight for
3000 s. The private bucket needs no `PUT` — nothing writes to it with a
presigned PUT.

```bash
aws s3api put-bucket-cors --bucket csd-media \
  --cors-configuration file://infra/s3-csd-media-cors.json
aws s3api put-bucket-cors --bucket csd-media-private \
  --cors-configuration file://infra/s3-csd-media-private-cors.json

# verify †
aws s3api get-bucket-cors --bucket csd-media
aws s3api get-bucket-cors --bucket csd-media-private
```

Adding a front-end origin (a staging domain, say) means editing the JSON **and**
re-applying it — and adding the same origin to `FRONTEND_URL`, which is a
comma-separated allowlist on the API side.

---

## 5. Reads

### Public media — direct S3, not CloudFront

`upload.service.ts` builds `publicUrl` as
`${AWS_CLOUDFRONT_MEDIA_URL}/${key}` when that variable is set and falls back to
`https://<bucket>.s3.<region>.amazonaws.com/<key>` otherwise.
**`AWS_CLOUDFRONT_MEDIA_URL` is never set in `serverless.yml`**, so in production
the fallback is the only path: blog and testimonial images are served straight
from `csd-media`, uncached and un-fronted. Any document claiming media is
CloudFront-fronted is wrong. If that ever changes, the S3 host must be swapped
for the CDN host in the CloudFront CSP too — `img-src` and `connect-src`, see
[`infra/SECURITY-HEADERS.md`](../infra/SECURITY-HEADERS.md).

### Private media — presigned GET only

Two methods, neither with a controller of its own:

| Method | Called from | TTL | Notes |
| --- | --- | --- | --- |
| `getNeedsFileUrl(s3Key)` | `RecoveryService.findByIdWithUrls()`, `WinterizationService` (admin detail views) | 300 s | Form-agnostic — the key already encodes which form it belongs to. Wrapped in try/catch per attachment, so one unsignable key does not fail the whole response |
| `getAboutDocFileUrl(s3Key, fileName, download)` | `AboutService` — public `GET /api/about/documents/:code/file?locale=` and admin `GET /api/about/admin/files/:fileId/url` | 300 s (`ABOUT_DOCUMENT_URL_TTL_SECONDS`) | Pins `ResponseContentType: application/pdf` and sets `Content-Disposition` to `attachment` or `inline` from the document's `access_mode` — the registry, not the browser, decides whether a file can be saved |

`Content-Disposition` is a **signed** response header, so the filename is reduced
to `[A-Za-z0-9._-]` before signing (`fileName.replace(...)`). A Cyrillic filename
passed through unchanged would break the signature comparison at S3 and return
403 — do not "fix" that regex.

Access modes gate the public path before any URL is signed: `on_request` throws
`ForbiddenException` (the request-and-release flow is PR-D5, not shipped),
`view_only` signs with `inline`, `public_download` signs with `attachment`.

---

## 6. Retention, orphans and PII

**There is no lifecycle rule on either bucket, and no S3 deletion anywhere in the
codebase** (`grep -rn "DeleteObject" backend/src` returns nothing). Every object
ever uploaded is still there.

Earlier versions of this document referenced
`infra/s3-csd-media-lifecycle.json` in a `put-bucket-lifecycle-configuration`
command. **That file has never existed.** Do not paste that command; it will fail
on the missing file. If a lifecycle rule is ever introduced, commit the JSON to
`infra/` alongside the two CORS files and add it to the runbook in
`ARCHITECTURE.md` §16.

### `media/needs/*` — the part that matters

This prefix holds mandatory photographs (3–10 per recovery form) and up to five
documents per form, including defect acts and cost estimates that carry the
applicant's contact name, position, phone and e-mail. Two properties compound:

- **Deleting a form does not delete its files.** The DB rows go, the objects
  stay, and there is no `s3:DeleteObject` to remove them with (§2.3). The keys
  survive in `needs_form_audit_log` as an `s3Keys` field change.
- **Nothing expires.** There is no retention period defined anywhere — not in
  code, not in `infra/`, not in the Ukrainian-law sense of a stated purpose limit.

Consequence: a deleted needs form leaves recoverable PII in the bucket
indefinitely, and the only inventory of the orphans is the audit log. A cleanup
script is the obvious fix and needs three things in order: an IAM statement
adding `s3:DeleteObject` on `csd-media-private/*`, a reconciliation query
(`needs_form_attachments.s3Key` vs. the object listing — which also needs
`s3:ListBucket`), and a retention decision from the fund. Tracked in
`ARCHITECTURE.md` §17.

### `media/testimonials/*` — abandoned uploads

Every anonymous submission uploads its photos immediately, but a testimonial
stays `pending` until moderated and may be rejected or simply never approved.
Those objects sit unreferenced. Storage is cheap and the pragmatic default is to
accept that.

**Do NOT put a blanket expiration on `media/testimonials/`** — approved,
published testimonials live under the same prefix and their photos would go with
it. Two safe options if abuse or cost ever makes this worth doing:

1. **Two-stage prefix (cleanest).** Upload to `media/testimonials/pending/`; on
   approval, the backend copies the object to `published/` and re-points
   `photos[].url`. A lifecycle rule can then expire `pending/` only. Requires a
   backend change on approval — plus `s3:CopyObject`/`DeleteObject` in IAM, which
   the role does not have today.
2. **Periodic reconciliation.** A scheduled job lists `media/testimonials/` and
   deletes objects whose URL appears in no `testimonials.photos` JSONB row.
   No upload-path change; needs `s3:ListBucket` + `s3:DeleteObject`.

Until one of them exists, evidence files are retained indefinitely.

---

## 7. Client-side validation is a courtesy, not a control

`shared/components/file-upload/file-upload.ts` (needs forms),
`testimonial-form.ts` and `testimonial-edit.ts` all check type and size before
requesting a presigned URL, and the testimonial forms downscale images to 1920 px.
That is UX, not security — an anonymous caller can skip the component entirely.
The real guards, in order, are: the guard on the endpoint, the `content-length-range`
and `eq $Content-Type` conditions inside the signed POST policy (enforced by S3
itself), and the owning service's re-validation of the echoed `s3Key` on submit.
The blog PUT flow has only the first and third of those — see §2.1.

---

## 8. Uploads and the Content Security Policy

Every upload is a **browser → S3 direct** `fetch`, so each bucket host must be in
the CloudFront CSP's `connect-src`, and any bucket whose objects are rendered in
an `<img>` must also be in `img-src`.

The **live** CSP allows `csd-media` but **not** `csd-media-private`. Nothing
breaks today only because the header is served `Report-Only`. Switching to
enforce without first applying `infra/cloudfront-response-headers-policy.json`
breaks the needs-form uploads, the About admin file upload and the admin
attachment previews. Full detail and the ordered procedure:
[`infra/SECURITY-HEADERS.md`](../infra/SECURITY-HEADERS.md); status of record:
[`ARCHITECTURE.md` §14.3](./ARCHITECTURE.md#csp-status--single-source-of-truth).
