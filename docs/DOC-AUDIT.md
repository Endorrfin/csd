# Documentation Audit — 2026-07-28 (rev. 2 2026-07-29 · rev. 3 2026-07-29, during pass A · rev. 4 2026-07-29, during pass B · rev. 5 2026-07-31, during pass C · rev. 6 2026-07-31, during pass D)

> ## ✅ The refresh is complete
>
> All four passes are done. **Every tracked document in this repository has been re-verified against the code**, most recently at `e5a4578` (2026-07-31). This file is now a *record* of that work, not a to-do list — §2's per-document drift tables describe states that no longer exist and are kept only so the reasoning is auditable.
>
> **Read §5 first.** It holds the twenty settled decisions — which document owns what, and what was deliberately not done. Re-litigating them is how the split falls apart.
>
> **What would make this stale again**, in rough order of likelihood: a new backend module or upload endpoint; a change to either GitHub workflow (especially adding a `ui` job to `test.yml`, which would flip the invariant sentence in §5 item 10); applying or enforcing the prepared CloudFront CSP policy; shipping PR-D4 of the About registry; and any change to an npm script, which must be mirrored in `CONTRIBUTING.md` §4. Live-AWS values (§5 item 15) go stale on their own schedule and carry re-check commands.

Ground truth for the documentation refresh. Every fact below was read from source at commit `d93b258` and spot-verified; nothing here is copied from an existing document.

> **Revision 2 (2026-07-29).** Three findings changed after live AWS output and repository archaeology. Two of them were **inverted** — see §0. Read §0 before anything else.
>
> **Revision 3 (2026-07-29, written during pass A).** `feat/test-infrastructure` has been **merged**, and `main` has moved from `d93b258` to `1c1030f`. Several rev. 1/2 findings flipped as a result, and one new production incident landed in between. See **§0.5**, which supersedes §0.3 and §3.6.
>
> **Revision 4 (2026-07-29, written during pass B).** `main` has moved again, to `6d84d64` (pass A merged as PR #139, plus PR #111 a11y header work). Three counts and one line-number list in this file were wrong on re-derivation. See **§0.6**.
>
> **Revision 5 (2026-07-31, written during pass C).** `main` is at `4ee8195` — pass B merged as PR #140. One consequential claim in §0.1/§2.10 was **too broad**: not every part of the About registry breaks under CSP enforce. See **§0.7**.
>
> **Revision 6 (2026-07-31, written during pass D — the last).** `main` is at `e5a4578` (pass C merged as PR #141). The three `CLAUDE.md` files and `CONTRIBUTING.md` are done, which completes the refresh. Corrections found in this pass: **§0.8**. Four more settled decisions: **§5 items 17–20**.

**Purpose.** The nine documents in this repo drifted 1–4 months behind the code. This file is the verified input for rewriting them, so the rewrite sessions do not have to re-discover the codebase. Where this file and a document disagree, this file wins; where this file and the code disagree, **the code wins** — re-verify before quoting.

**Audit method.** Four parallel code inventories (backend, frontend, infra/CI, Recovery+Winterization), then a per-document drift pass, then a manual spot-check of the highest-impact claims, then (rev. 2) verification against live AWS output.

---

## 0. Corrections to the first revision

### 0.1 CSP — the finding was backwards, and it hides a live landmine

Rev. 1 said `infra/SECURITY-HEADERS.md` documents an older CSP than `infra/cloudfront-response-headers-policy.json`. **The opposite is true.**

Live header, `curl -sI https://www.csd-fund.org/` on 2026-07-29:

```
content-security-policy-report-only: default-src 'self'; base-uri 'self'; object-src 'none';
  frame-ancestors 'self'; form-action 'self';
  img-src 'self' data: blob: https://i.ytimg.com https://*.basemaps.cartocdn.com https://unpkg.com
          https://csd-media.s3.eu-central-1.amazonaws.com;
  script-src 'self' 'unsafe-inline' https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  font-src 'self' data:;
  connect-src 'self' https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com
          https://csd-media.s3.eu-central-1.amazonaws.com;
  frame-src 'self' https://www.youtube.com;
  upgrade-insecure-requests
```

That is **exactly** what `SECURITY-HEADERS.md:41-53` documents. So that document is accurate about the live state.

The repository JSON is the one that is out of sync — in the other direction. It contains four entries that **were never applied to AWS**:

| Directive | In the repo JSON | Live |
| --- | --- | --- |
| `img-src` | `+ https://csd-media-private.s3.eu-central-1.amazonaws.com` | absent |
| `script-src` | `+ https://challenges.cloudflare.com` | absent |
| `connect-src` | `+ csd-media-private...` and `+ challenges.cloudflare.com` | absent |
| `frame-src` | `+ https://challenges.cloudflare.com` | absent |

**Consequence — this is the important part.** The live CSP has no allowance for Cloudflare Turnstile or the private media bucket. Nothing breaks today only because the policy is `Report-Only`. The moment it is switched to enforce, the Recovery and Winterization forms stop working: the Turnstile script (`script-src`) and its iframe (`frame-src`) are blocked, and the presigned POST to `csd-media-private` (`connect-src`) is blocked. The About registry's presigned GETs are affected the same way.

The repo JSON is therefore a **correct, prepared, unapplied fix**. It must be applied *before* any move to enforce. This belongs in `ARCHITECTURE.md` §14 and `SECURITY-HEADERS.md` as a blocking prerequisite, not as a footnote.

### 0.2 Response-headers policy — identified, and attached everywhere

Verified 2026-07-29 against live CloudFront:

| | Value |
| --- | --- |
| Policy ID | `0dfcb167-3b72-4c89-8574-0465ee42283c` |
| Policy name | `csd-frontend-security-headers` — matches `cloudfront-response-headers-policy.json:2` |
| Distribution | `E3U465AMSVR9PN` |
| Attached to | `DefaultCacheBehavior` **and all 9 additional cache behaviours**: `*.js`, `*.css`, `/assets/*`, `/favicon.ico`, `/favicon-96x96.png`, `/apple-touch-icon.png`, `/site.webmanifest`, `/web-app-manifest-192x192.png`, `/web-app-manifest-512x512.png` |

Two consequences worth writing down:

- The "attach the policy to every behaviour" step in `SECURITY-HEADERS.md:69-73` **was actually completed** — coverage is total, so a future switch to enforce flips consistently across the whole distribution rather than partially.
- The **policy ID was the one piece of information missing** from `SECURITY-HEADERS.md`, which is what made its documented enforce procedure (`:90-99`, which needs `<POLICY_ID>` and an ETag) impossible to execute as written. Record it.

An earlier `list-response-headers-policies --type custom` filtered by name returned empty; that was an artefact of the query, not a real mismatch. Use `get-response-headers-policy --id` for authoritative answers.

### 0.3 e2e infrastructure — not missing, unmerged

Rev. 1 said `backend/test/jest-e2e.json` does not exist and that `CONTRIBUTING.md`'s Testcontainers section was fabricated. Both were too harsh.

`jest-*.json` sits in `backend/.gitignore:38` and has been there since the **first commit** (`14de9b5`). The NestJS CLI generates `test/jest-e2e.json`, so it exists in any working copy created by `nest new` but never reaches a `git clone`. That is why it is present in the older working copy at `~/i-data/src/csd` and absent here.

The Testcontainers infrastructure is real and lives on branch **`feat/test-infrastructure`** (originally `2ee3baa`, 2026-05-31; rebased onto `main` as `8f32e52` on 2026-07-29). It contains:

- `.github/workflows/test.yml` — **PR Checks**, triggered on `pull_request` against `main`, i.e. the pre-merge gate the repo currently lacks
- `test/setup-pg.ts`, `teardown-pg.ts`, `test-app.factory.ts`, `setup-env.ts`, `factories/user.factory.ts`
- `@testcontainers/postgresql` + `testcontainers` ^12.0.1 in `backend/package.json`
- migration `1776000000000-InitialSchema.ts` (baseline) → **14 migrations on this branch, 13 on `main`**
- `scripts/verify-baseline-against-prod-schema.ts`
- a `!test/jest-e2e.json` negation in `backend/.gitignore`, which fixes the clone problem

So `CONTRIBUTING.md` describes **real work that was never merged**, not an invention. The correct fix is not to delete the text but to state where that infrastructure lives.

**This changes what "current state" means for the docs.** Two of the sharpest findings in §1.4 — "no PR-check CI" and "`test:e2e` cannot run" — are true of `main` and false of `feat/test-infrastructure`. Merge the branch before the documentation refresh, or the new documents are stale the day they land.

### 0.4 Database versions — confirmed from both ends

| | Version | Verified by |
| --- | --- | --- |
| Local dev | **PostgreSQL 14.19**, Homebrew `postgresql@14`, port 5432 | `brew services list`, `psql -d postgres` |
| Production | **PostgreSQL 16.13**, RDS `csd-postgres` | `aws rds describe-db-instances --query 'DBInstances[0].EngineVersion'` |

`postgresql@15` is also installed locally but not started. If it ever starts it will contend for port 5432 — the exact cause of Incident #1 in `ARCHITECTURE.md:1151`.

The dev/prod major-version skew (14 vs 16) is real and undocumented: migrations are authored and tested on 14, applied to 16. Usually benign, occasionally not.

### 0.5 Rev. 3 — `feat/test-infrastructure` is merged, and `main` moved on

**Supersedes §0.3 and §3.6.** Verified at HEAD `1c1030f`.

`feat/test-infrastructure` merged as `dfac315` (PR #78). Three commits landed on `main` after it. The findings that were *conditional on the merge* are now simply **false of `main`**:

| Rev. 1/2 finding | Status at `1c1030f` |
| --- | --- |
| "No PR-check CI on `main`" | **FALSE.** `.github/workflows/test.yml` ("PR Checks") runs on `pull_request` → `main` |
| "`backend/test/jest-e2e.json` does not exist / is gitignored" | **FALSE.** It is tracked, via the `!test/jest-e2e.json` negation at `backend/.gitignore:39` |
| "`test:e2e` cannot run on a clone" | **FALSE.** Testcontainers `postgres:16-alpine`, runs all migrations, `maxWorkers: 1` |
| "13 migrations on `main`, 14 on the branch" | **14 on `main`** |
| CONTRIBUTING's Testcontainers section describes an unmerged branch | It now describes `main` |
| CONTRIBUTING:500 "not running lint before pushing blocks the PR" | Now **true for the backend**; still false for `ui` |

**What `test.yml` does *not* cover, and this is the sharpest remaining CI finding:** it has exactly **one job**, `backend`. The entire `ui` app is ungated on pull requests — no `ng lint`, no `typecheck`, no `ng test`, no `format:check`, no `ng build`. `ui`'s only CI execution is the production build in `deploy.yml`, after merge. Neither workflow ever invokes `npm run verify`.

**New since `d93b258` — Incident #4, a second ESM production outage.** `sanitize-html` ≥ 2.17.6 pulls ESM-only `htmlparser2` v12. AWS's managed `nodejs22.x` is built **without** `require(esm)` support and it cannot be re-enabled via `NODE_OPTIONS` — but plain Node 22.12+ locally and on GitHub Actions *does* support it, so every check stayed green while production returned 502 on every route. Jest could not catch it either (`transformIgnorePatterns` downlevels those files to CJS).

Mitigations now in the repo, all of which the documents must describe:
- `backend/scripts/check-cjs-load.cjs` + `npm run check:cjs` — `require()`s every runtime dependency under `node --no-experimental-require-module`.
- Wired into `test.yml` (pre-merge) **and** `deploy.yml` *before* the migration steps, so a build known not to boot never mutates prod RDS.
- `sanitize-html` pinned exact (`2.17.5`); `.github/dependabot.yml` ignores it at every level and ignores **all npm majors** for both apps.
- `backend/verify` chain is now `typecheck → lint:check → check:cjs → test → build`.

**Corrections to rev. 1/2 counts and claims, verified this pass:**

| §1 claim | Correction at `1c1030f` |
| --- | --- |
| "Backend jest suites / tests: 17 / 176" | 17 suites confirmed. The test count was **not** re-verified by execution this pass; a `grep` of `it(`/`test(` gives ~158. Re-run `npx jest` before quoting a number |
| "UI feature folders 14 public + 12 admin" | 14 public, **13** admin subfolders (`about`, `complaints`, `inquiries`, `procurements`, `recovery-form-detail`, `recovery-forms-list`, `testimonials`, `users-management`, `vacancies`, `wash-form-detail`, `wash-forms-list`, `winterization-form-detail`, `winterization-forms-list`) |
| §1.3 "Blog, `/pages` **and About sections** accept Quill HTML with no server-side sanitization" | **Partly wrong.** Blog and `/pages` are unsanitized — confirmed. **About sections *are* sanitized**, but inside `about.service.ts` with its own locally-defined options object, not via `SanitizeHtmlPipe`. Two independent sanitizer configs exist |
| §1.2 About `code` "(unique, `/^CSD-[A-Z]{3,4}-\d{2}$/`)" | The regex is **`class-validator` only — there is no DB CHECK constraint**. The database enforces `varchar(32)` + `NOT NULL` + `UNIQUE` |
| §1.2 recovery/winterization "6 / 7 public steps" | Confirmed — but note neither component has a `totalSteps` property; the steps are an array. `totalSteps` exists only in the procurement form |

**New findings not in rev. 1/2, all documented in `ARCHITECTURE.md` pass A:**

- `POST /api/upload/presigned-url` (blog images, presigned **PUT**) has **no size cap at all** — a presigned PUT cannot carry a `content-length-range` condition. Its MIME rejection also throws a **500**, not a 400.
- `AWS_S3_MEDIA_BUCKET` has the code default `''`, so **locally** public-media presigned URLs are generated against an empty bucket name with no error.
- `AWS_S3_PRIVATE_BUCKET` and `WINTERIZATION_HOUSEHOLD_ENABLED` are **not** in `deploy.yml`'s deploy-step `env:` block, so both always take their `serverless.yml` defaults regardless of GitHub configuration.
- `src/database/run-seeds-standalone.ts` is **dead code** — no npm script and no import references it, and it seeds equipment only.
- `backend` has an undocumented `verify:prod-baseline` script (read-only prod schema diff); no workflow invokes it.
- The backend IAM role has **no `s3:DeleteObject`**, which is *why* deleting a needs form leaves its S3 objects behind — the code could not remove them even if it tried.
- `RolesGuard` returns `true` when `@Roles()` is absent or empty, so `@UseGuards(RolesGuard)` without the decorator is a silent no-op.
- `infra/s3-csd-media-private-cors.json` exists (rev. 2 §2.3 implied it might not).

### 0.6 Rev. 4 — corrections found while writing pass B

Verified at HEAD `6d84d64`. Everything below was re-derived from the source, not copied.

| Claim in this file | Correction |
| --- | --- |
| §3.1: root `README.md` says `postgresql@16`/`PostgreSQL 16` for local dev "in seven places: lines 24, 45, 195, 196, 199, 387, 572" | **Five, not seven.** Lines 387 and 397 (`Then start a PostgreSQL 16 container` / `postgres:16`) are the **Windows Docker** path, and `postgres:16` is the correct, documented Docker image — `ARCHITECTURE.md:143,1292` and `backend/README.md:31` both say so. Line 218 is the same image on macOS. The genuinely wrong ones were 24, 195, 196, 199, 572 (Homebrew `postgresql@16`); line 45 was ambiguous rather than wrong (it named the prod version under a generic "Database" heading) and was rewritten as a three-row table |
| §1.1 / §1.2: equipment catalogue "21 categories / ~230 items" | 21 categories / **232** items (`grep -c "ltaCode:" backend/src/database/seed-equipment.ts`) |
| §1.4: "~19 files use `LanguageService`, ~35 still read `translate.currentLang`" | Re-derived: **19** files reference `LanguageService` excluding its own definition; **35** read `translate.currentLang`. Both figures hold at `6d84d64` — the "~" can be dropped |
| §1.1: "Backend jest suites 17" | Confirmed by file count: 17 `*.spec.ts` under `backend/src`, plus **1** `*.e2e-spec.ts` under `backend/test`. Test *case* count still not verified by execution — do not quote one |
| §2.7 (`backend/README.md:100-103`): "two standalone scripts" | There are three files outside the bootstrap chain: `seed-super-admin.ts`, `seed-about-documents-standalone.ts` and `run-seeds-standalone.ts` — the last being dead code (§0.5) |

**Four findings that are new in rev. 4** — none appear anywhere in §1–§3, and two of them were also wrong in `ARCHITECTURE.md` after pass A (corrected in the same pass):

- **Testimonial hard-delete is ungated.** `TestimonialService.remove()` is `await this.findById(id); await this.repo.delete(id);`, commented *"any testimonial can be hard-deleted (admin confirms in UI)"*. The `rejected`-only rule exists only in a stale `testimonial.controller.ts` comment. So state-gated hard deletes exist in **three** modules, not four: draft procurement, draft vacancy, closed complaint. `ARCHITECTURE.md:977`, `:1589` and `:1673` all said "rejected testimonial" — fixed.
- **`POST /api/testimonials` is anonymous** (no `@UseGuards` on `testimonial.controller.ts`). §1.4 lists the anonymous endpoints; this one was folded into "admin CRUD" in the README.
- **Every complaint admin route is `MANAGER, ADMIN, SUPER_ADMIN`** — manager+, not admin-only. Only the *frontend* route is `adminGuard`. Documents describing the module as "admin-only" conflate the two.
- **`GET /api/procurement` returns every non-draft record**, not published only (`where: { status: Not(DRAFT) }`), deliberately so cancelled and completed tenders stay visible. The vacancy row of the same table was already correct.

Two smaller ones: `AppController.getHealth()` returns `{ status, timestamp }`, so `{"status":"ok"}` is not a literal match for a smoke test; and `assertRequiredEnv()`'s messages are *"JWT_SECRET is required but missing…"* / *"JWT_SECRET is too short (N chars)…"*, not the `must be at least 32 characters` string the root README quoted.

Two things this file did **not** flag that pass B added to the READMEs, both re-verified:

- `ui`'s `verify` is `typecheck → lint → format:check → test:ci → build`, and its `lint` is plain `ng lint` — **no `--fix`**. Only the *backend*'s `lint` carries `--fix`. §2.9/§3.5 discuss the backend case; the ui distinction was never stated.
- `POST /api/upload/testimonial-presigned` is genuinely **unauthenticated** (no guard at all, by design — the testimonial form is anonymous). §1.3 lists the four endpoints but never says this one is open.

### 0.7 Rev. 5 — corrections found while writing pass C

Verified at HEAD `4ee8195` (pass B merged as PR #140; the pass-C prompt still said `6d84d64`).

**The one that matters — §0.1 and §2.10 over-claim.** Both say that switching the CSP to enforce breaks "the About registry" via its presigned GETs, alongside the Recovery and Winterization forms. The forms are right. The About claim is **half right**, and the wrong half would send someone debugging the wrong thing:

| Path | Enforce today | Why |
| --- | --- | --- |
| Public `/about/documents` file link | **survives** | `about-documents.ts:419-423` fetches the link from the allowlisted API host and then calls `window.open(url, '_blank', 'noopener')`. A top-level navigation is governed by no CSP fetch directive — `navigate-to` was never shipped in any browser, and `default-src` does not cover navigation |
| Admin About file upload | **breaks** — `connect-src` | `admin/about/documents/document-files.ts:371` does `fetch(presigned.url, {method:'POST'})` straight to `csd-media-private`. No new registry document can be published |
| Admin About file preview | survives | also `window.open` (`document-files.ts:286`) |
| Admin recovery/winterization attachment previews | **breaks** — `img-src` | `recovery-form-detail.ts:518,617` renders `<img [src]="…presigned GET on csd-media-private">` in the thumbnail grid and the lightbox. Attached *documents* are `<a href target="_blank">`, so those survive |

So the correct blocking statement is: **enforce breaks the two needs forms (Turnstile `script-src`/`frame-src`, upload `connect-src`), the About admin upload (`connect-src`) and the admin attachment previews (`img-src`).** The public registry page is in scope only from PR-D4 onwards, which replaces `window.open` with an in-app viewer (`about-documents.ts:405` marks the spot). The prepared JSON covers all of it either way — the conclusion "apply before enforce" is unchanged, only the reasoning was loose.

**Smaller corrections and additions, all new to this file:**

| Item | Finding |
| --- | --- |
| §0.5 "`presigned-url` returns 500 on a MIME violation" — no mechanism given | The endpoint takes an **inline body type, not a DTO**, so the global `ValidationPipe` has no metatype to validate and never runs; the service throws `InternalServerErrorException`. The other three return **400**: `TestimonialUploadDto` and `AboutDocUploadDto` reject via `@IsIn`, `needs-presigned` via the service's `BadRequestException` (its DTO only has `@IsString()` on `contentType`) |
| §0.5 / `README.md` §2.3: `AWS_S3_MEDIA_BUCKET=''` produces presigned URLs "with **no error**" | **True of one flow, false of the other.** Probed with the repo's own `@aws-sdk` on 2026-07-31: `getSignedUrl(PutObjectCommand{Bucket:''})` **throws** `No value provided for input HTTP label: Bucket.`, so `POST /api/upload/presigned-url` fails at generation with a 500. `createPresignedPost({Bucket:''})` **succeeds silently** and returns the path-style `https://s3.eu-central-1.amazonaws.com/`, so only `testimonial-presigned` fails later, in the browser. The `https://.s3.…` form is the interpolated `publicUrl` string, not the upload URL. `README.md` §2.3's table cell was corrected in pass C |
| Private vs. public bucket guard asymmetry | `assertPrivateBucketConfigured()` throws a clear 500 when `AWS_S3_PRIVATE_BUCKET` is empty. There is **no equivalent for `AWS_S3_MEDIA_BUCKET`** — the SDK's own behaviour above is all there is |
| §2.3 "the owning service re-validates the prefix" | The **submit DTOs** pin the key prefix with `@Matches` (`recovery-attachment.dto.ts:26`, `winterization-attachment.dto.ts:30`, `create-about-document-file.dto.ts:35` via `ABOUT_DOCUMENT_S3_KEY_PATTERN`). Only MIME and size are re-checked in the service, and only for the needs forms (`assertValidAttachments`); About does both at DTO level |
| CORS configs are not symmetric | `s3-csd-media-cors.json` allows `GET`/`PUT`/`POST`; `s3-csd-media-private-cors.json` allows `GET`/`POST` only — correct, since nothing writes to the private bucket with a presigned PUT |
| Backend HSTS ≠ CloudFront HSTS | helmet sets `max-age=15552000` (180 d) on the API; the CloudFront policy sets `63072000` (2 y). `SECURITY-HEADERS.md` documented only the second, inviting the assumption that they match |
| `infra/s3-csd-media-lifecycle.json` | Confirmed: never existed in git history, not just absent from the working tree. §2.3 called it WRONG; it is safe to state flatly that the file has never existed |
| Needs-form presigned GETs are best-effort | `findByIdWithUrls()` in both services wraps each `getNeedsFileUrl` in try/catch and yields `url: null` on failure, so an S3 outage degrades the admin detail view instead of failing the request. Not documented anywhere before pass C |

### 0.8 Rev. 6 — corrections found while writing pass D

Verified at HEAD `e5a4578`. Everything below was re-derived from the source.

**One row of this file is wrong.** §2.5 line 46 says `backend/CLAUDE.md`'s *"about = sections + documents"* should read *"sections only since PR-D3"*. **That is backwards.** `src/modules/about/` holds `about-section.entity.ts`, `about-document.entity.ts` **and** `about-document-file.entity.ts`, and `about.controller.ts` exposes `POST /admin/documents` and `POST /admin/documents/:id/files`. The module carries both. The only wrong half of the original line was its parenthetical — the root `README.md` *does* cover About. Corrected in pass D.

| Item | Finding |
| --- | --- |
| §0.5: "Neither workflow ever invokes `npm run verify`" — true but incomplete | Worth stating positively, because the gap is wider than it reads: `test.yml`'s single `backend` job runs `lint:check → check:cjs → test → test:e2e`. It does **not** run backend `typecheck`, `format` or `build`. So `typecheck` is ungated on *both* apps, not just on `ui` |
| `CONTRIBUTING.md:236` described backend `verify` as "typecheck + lint:check + test + build" | **`check:cjs` was missing from the chain** — the step that exists specifically because two production outages got past every other check. Not flagged in §2.9. Fixed in pass D |
| §0.6 covered `ui`'s `format:check` (SCSS only) but not the backend's | **The backend has no `format:check` script at all** — `format` is write-only over `src/**/*.ts` and `test/**/*.ts`. Nothing anywhere verifies backend formatting. Combined with the row above: `verify` format-checks SCSS in one app and nothing in the other |
| §2.5 "Add: Turnstile contract" — under-specified | The contract has a third part beyond the header name and the fail-closed policy: `serverless.yml` allowlists **`X-Turnstile-Token`** in the API Gateway CORS `headers` block on both `http` events. Guarding a new route means editing `serverless.yml` too, or the browser preflight strips the header |
| §2.4 (root `CLAUDE.md`) omitted two deploy claims that are wrong | Line 57 said the frontend smoke test checks `<app-root>` presence — it greps **`ng-server-context`** (§2.1 caught the identical error in the root README but not here). Line 55 said `workflow_dispatch` "cancels in-flight PR-merge runs in its concurrency group" — the group is `deploy-prod-${{ github.event_name }}`, so the two event types land in **different groups** and neither can cancel the other. Pass A found this in `deploy.yml`'s own comment; the same claim was live in `CLAUDE.md` |
| §2.6 (`ui/CLAUDE.md`) treated `ssr-lambda.mjs` as merely "legacy/alternative" | The two entries wrap **different exports** — `lambda.mjs` wraps `app`, `ssr-lambda.mjs` wraps `handler`. `serverless.yml` points at `lambda.mjs`. Editing the wrong file produces no error and no effect |
| §2.6 line 14 "Leaflet via `allowedCommonJsDependencies` → not a dependency at all" | Correct but easy to over-apply. `angular.json:61-66` lists four entries; `quill` and `quill-delta` **are** real dependencies and are load-bearing. Only the `leaflet` and `leaflet.markercluster` entries are dead. Removing the whole array would break Quill |
| `backend/CLAUDE.md:44` "21 categories / ~230 items" | 21 / **232**, per §0.6. That file was a second instance of the count the audit only tracked in the READMEs |
| §0.5: "UI feature folders **14 public + 13 admin**" | **Double-counts `admin/`.** `ui/src/app/features/` holds **14 folders, one of which is `admin/`** — so 13 public + `admin/`, and `admin/` itself has the 13 subfolders §0.5 lists correctly. The phrasing propagated into pass D's first draft before being caught. Write it as "14 top-level, 13 of them public" |
| `backend/CLAUDE.md` "public endpoints have no decorators" → §2.5 correction "3 public routes carry `TurnstileGuard`" | True but incomplete. **`POST /api/auth/login` carries `@UseGuards(AuthGuard('local'))`** — anonymous in the JWT sense, but the Passport local strategy is what validates the credentials. Removing it makes login accept anything. Five auth-adjacent routes are genuinely bare, not six |
| §1.4's "all API calls through `ApiService`" correction — "five admin lists use raw `fetch` for XLSX" | There is a **second** raw-`fetch` category, larger than the first: direct-to-S3 presigned uploads, in `file-upload.ts`, `admin/about/documents/document-files.ts`, `admin/testimonials/testimonial-edit.ts`, `cooperation/testimonial/testimonial-form.ts` and `home/home.ts`. Those must *not* carry the interceptor's `Authorization` header, so they are correct as written — a reader told only about the XLSX case would "fix" them |
| `main.ts` / `lambda.ts` "in lockstep" | The **options** match; the **statement order does not**. `main.ts` is prefix → CORS → pipe, `lambda.ts` is CORS → pipe → prefix. Harmless (Nest applies them at init/listen), but a document that says "both, in this order" invites a cosmetic reorder of the prod entry point |
| `getFrontendOrigins()` "not hardcoded to `localhost:4200`" | Correct, but `frontend-urls.ts:11` defines `DEFAULT_FRONTEND_URL = 'http://localhost:4200'` and returns it when `FRONTEND_URL` is empty. That fallback is load-bearing for local dev and e2e; production is protected by `assertRequiredEnv()`. Say both or someone deletes it |
| `backend/CLAUDE.md` "manual CSV with UTF-8 BOM for complaints" | **Two** hand-rolled CSV exporters with the same BOM — `complaint.controller.ts:64` and `inquiry.controller.ts:60`. No shared helper, so a fix to one misses the other |
| Root `CLAUDE.md` "other `docs/` subfolders are gitignored" | Only some are. `forms/`, `about-documents/`, `screenshots/`, `audit/` and `Invoices/` are ignored; **`Research/` and `pоlicies_and_procedures/` are untracked but *not* ignored**, so `git add docs/` would commit them |

**One thing pass D deliberately did not do.** §2.9 lists `CONTRIBUTING.md`'s commit-message examples that reference a "reading time pipe" (lines ~119, ~157, ~547). `ReadingTimePipe` does not exist, but those three are *illustrations of commit format* for a hypothetical change and never assert the pipe is in the repo. Only line ~271 — which listed it as a real test target — was a false claim, and only that one was fixed. Rewriting the examples would be churn with no accuracy gain.

---

## 1. Verified inventory

### 1.1 Scale

| Metric | Value | How to re-verify |
| --- | --- | --- |
| Backend modules | 15 | `ls backend/src/modules` |
| Controllers | 16 (incl. `app.controller.ts`) | `find backend/src -name '*.controller.ts'` |
| Route decorators | 118 | `grep -rho "@\(Get\|Post\|Patch\|Put\|Delete\)(" backend/src --include=*.controller.ts \| wc -l` |
| Entity files / `@Entity` classes | 29 / 29 | `find backend/src -name '*.entity.ts' \| wc -l` |
| Migrations | **14** on `main` since the merge (incl. `1776000000000-InitialSchema`) — see §0.5 | `ls backend/src/database/migrations` |
| Backend jest suites / tests | 17 suites; test count not re-verified by execution in rev. 3 — see §0.5 | `cd backend && npx jest` |
| UI feature folders | **14 total**, 13 public + `admin/`; `admin/` has 13 subfolders. ~~14 public + 13 admin~~ double-counts `admin/` — see §0.5 and **§0.8** | `ls ui/src/app/features` |
| UI TypeScript files | 107 | `find ui/src/app -name '*.ts' \| wc -l` |
| **UI spec files** | **2** | `find ui/src -name '*.spec.ts'` |

The 15 modules: `about`, `auth`, `blog`, `complaint`, `content`, `cooperation`, `equipment-catalog`, `inquiry`, `needs`, `partners`, `procurement`, `testimonial`, `upload`, `users`, `vacancy`.

### 1.2 The three undocumented features

Nothing in any document mentions these. They are the bulk of the rewrite.

**Recovery form** — `/needs/recovery-form`, `POST /api/needs-forms/recovery`.
Tables `recovery_forms` (74 cols) + `recovery_form_damages`. Tracking `CSD-R-<year>-<0000>`. 6 public steps. 3–10 photos mandatory. `estimatedCost` NOT NULL. Migration `1777800000000-AddRecoveryForms.ts` — **which also creates the shared needs infrastructure**: `form_number_sequences`, `needs_form_attachments`, `needs_form_audit_log`, pg type `needs_form_status_enum`.

**Winterization form** — `/needs/winterization-form`, `POST /api/needs-forms/winterization`.
Tables `winterization_forms` (80 cols) + `winterization_form_needs`. Tracking `CSD-W-<year>-<0000>`. 7 public steps. `needCategories text[]` with a **GIN index** — the admin filter must use `@> ARRAY[...]`, not `= ANY`, or the index is unused. `estimatedCost` nullable by design. `applicantType='household'` returns **422** unless `WINTERIZATION_HOUSEHOLD_ENABLED='true'`; the gate is re-checked on admin `PATCH /full`. Migration `1777900000000-AddWinterizationForms.ts`.

**About document registry** — `/about/documents`, tables `about_documents` + `about_document_files`. Migration `1778000000000-RestructureAboutDocuments.ts` converted `document_type` from pg enum to `varchar(32)` with 10 values, added `code` (unique, `/^CSD-[A-Z]{3,4}-\d{2}$/`), `access_mode` (`public_download|view_only|on_request`), `next_review_date`, and renamed `file_url` → `legacy_file_url`.

Both needs forms: `TurnstileGuard` on submit, presigned-POST attachments into the **private** bucket, shared `needs_form_audit_log`, 3-sheet XLSX export, one Angular component serving both the public form and the admin full-edit via `@Input() mode: 'create'|'edit'`.

### 1.3 Facts that contradict multiple documents

| Fact | Documents that get it wrong |
| --- | --- |
| `GET /api/about` returns **sections only**; the registry is `GET /api/about/documents`; single file via `GET /api/about/documents/:code/file?locale=` (presigned GET, TTL 300 s) | README §2, ARCHITECTURE 217/634, backend/CLAUDE 46, backend/README 259 |
| Two media buckets: `csd-media` (public) and `csd-media-private` (recovery, winterization, about PDFs). Static bundle in `csd-fund-static` | README 27/52, ARCHITECTURE 92/728, MEDIA-UPLOADS (whole file), CLAUDE 59–65, backend/CLAUDE 14/146 |
| **Four** upload endpoints, three of them presigned **POST**, not PUT | README 77, ARCHITECTURE 224, MEDIA-UPLOADS 8, backend/CLAUDE 45 |
| `TurnstileGuard` on exactly 3 routes (`POST needs-forms/recovery`, `POST needs-forms/winterization`, `POST upload/needs-presigned`); token in the **`x-turnstile-token` header** because the global `ValidationPipe` sets `forbidNonWhitelisted` | absent from every document |
| `run-seeds.ts` runs `seedEquipmentCatalog()` **and** `seedAboutDocuments()` — and only locally; `lambda.ts` never seeds | README 47/83, ARCHITECTURE 207/888, backend/CLAUDE 38, backend/README 95 |
| `lambda.ts` now sets `forbidNonWhitelisted: true` (line 52) — **the prod/local ValidationPipe asymmetry no longer exists** | backend/CLAUDE 122–129, CONTRIBUTING 459 still teach it as current |
| `SanitizeHtmlPipe` is used by **only** `vacancy.controller.ts` and `procurement.controller.ts`. Blog and `/pages` accept Quill HTML with no server-side sanitization. **About sections *are* sanitized** — but by a second, independent config inside `about.service.ts`, not by the pipe (rev. 3 correction, §0.5) | README 26, ARCHITECTURE 1046/1050 claim "defense in depth" |
| `backend/serverless.yml` grants `s3:PutObject` **and `s3:GetObject`** on the private bucket, not only `PutObject` on `csd-media/*` | ARCHITECTURE 779/834, backend/CLAUDE 146 |
| `AWS_CLOUDFRONT_MEDIA_URL` is read in code but **never set** in `serverless.yml` → prod public media URLs are direct S3, not CloudFront | README 52/54, ARCHITECTURE 749 |
| Language is hardcoded to `'ua'` on every bootstrap (`app.ts`) and **never persisted** — no localStorage, cookie or URL segment | README 37, ARCHITECTURE 645, ui/CLAUDE 12 |
| CSP is live as **Report-Only**. `SECURITY-HEADERS.md:41-53` matches the live header; the **repo JSON is the unapplied one** — see §0.1 | ARCHITECTURE 1145/1329 (contradict each other) |

### 1.4 Facts absent from every document

- ~~**No PR-check CI on `main`.**~~ **Superseded by §0.5 — `test.yml` is now on `main`.** What remains true: `deploy.yml` still runs no lint, typecheck or tests in either job, and `test.yml` gates the **backend only**, so the entire `ui` app has no pre-merge gate and `npm run verify` is an honour-system local step there.
- **Migrations run before build and deploy.** A failed build leaves prod already migrated.
- **UI has 2 spec files** for 107 source files. No `vitest.config.ts` exists; `angular.json`'s `test` target has no options block.
- **`ui` `format:check` checks SCSS only** (`prettier --check "src/**/*.scss"`), while `format` writes ts+html+scss. So `verify` never catches TS/HTML formatting drift.
- ~~**`backend/test/jest-e2e.json` is gitignored, not absent.**~~ **Superseded by §0.5** — the `!test/jest-e2e.json` negation (`backend/.gitignore:39`) is on `main` and the file is tracked. `npm run test:e2e` now works from a clean clone, given Docker.
- **No Swagger, no `@nestjs/throttler`, no global exception filter, no global interceptors, no CloudWatch alarms, no X-Ray** anywhere in the repo.
- **Password-reset links are logged, not emailed** (`auth.service.ts:89`, `TODO: Replace with EmailService`). JWT expiry 7d.
- **`RolesGuard` lets `super_admin` bypass every role list**, so it implicitly has access to every `+Roles` route.
- **Env vars read in code but missing from `backend/.env.example`:** `NODE_ENV`, `PORT`, `AWS_REGION`, `AWS_S3_MEDIA_BUCKET`, `AWS_CLOUDFRONT_MEDIA_URL`.
- **`backend/serverless.yml` hardcodes `DB_PORT: '5432'`** — the `DB_PORT` GitHub secret reaches only the migration steps, never the Lambda. No VPC, no plugins.
- **`inquiry` module is missing from every module list in every document** (`/api/inquiries`, 6 routes, entity, admin UI with `adminGuard`).
- **Recovery/Winterization hard-delete is ungated** — `@Roles(ADMIN)` with no status check, unlike procurement/vacancy/testimonial/complaint.
- **Five admin list components call `localStorage.getItem('token')` with no `isPlatformBrowser` guard** (inquiries, recovery, wash, complaints, winterization lists) for the XLSX `fetch` export — violating a rule `ui/CLAUDE.md` states as invariant.
- **`ui/package.json:36` carries a squatted dependency** `"ngx-translate": "^0.0.1-security"` — not the real package, imported nowhere.
- **The signal migration is partial:** ~19 files use `LanguageService`, ~35 still read the non-reactive `translate.currentLang`. The app is zoneless, so `currentLang` does not trigger change detection.
- **The CloudFront response-headers-policy ID is recorded nowhere in the repo.** It is `0dfcb167-3b72-4c89-8574-0465ee42283c` (`csd-frontend-security-headers`), attached to all 10 cache behaviours of `E3U465AMSVR9PN` — see §0.2.
- **No log retention configured** in either `serverless.yml` → CloudWatch default is *never expire*, not the 30 days ARCHITECTURE claims.

---

## 2. Per-document drift

Severity: **WRONG** = states something false · **STALE** = was true, no longer · **MISSING** = important fact absent.

### 2.1 `README.md` (614 lines, last touched 2026-06-17)

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 26 | `ValidationPipe({whitelist, transform})` | also `forbidNonWhitelisted: true` | WRONG |
| 26 | `SanitizeHtmlPipe` for "Quill rich-text fields" | only vacancy + procurement controllers | WRONG |
| 27 | one bucket `csd-media`, presigned PUT, CloudFront-fronted | two buckets; 3 of 4 flows are presigned POST; not CloudFront in prod | WRONG |
| 28 | XLSX for WASH, CSV for complaints | also recovery + winterization XLSX, and inquiries CSV | STALE |
| 47 | seeders run super-admin, equipment, locations | only equipment + about-documents; contradicts line 83 of the same file | WRONG |
| 55 | frontend smoke test greps `<app-root>` | greps `ng-server-context` | WRONG |
| 63–78 | 14-module table | 15 modules — `inquiry` absent | MISSING |
| 71 | procurement "6-step form" | `totalSteps = 7`; ARCHITECTURE:690 says 7 | WRONG |
| 75 | needs = wash routes only | 20 more recovery/winterization routes | MISSING |
| 77 | one upload endpoint | four | WRONG |
| 78 | `GET /about` returns sections **and documents** | sections only | WRONG |
| 94 | `/about` a single page | shell + two children | STALE |
| 103 | needs = `/needs/wash-form` | plus recovery-form, winterization-form | MISSING |
| 107–113 | 6 admin items | 12+ | MISSING |
| 137/195 | `postgresql@16` | ARCHITECTURE:130 says `postgresql@14` — docs contradict | WRONG |
| 259–271 | `.env` template = DB/JWT/FRONTEND only | plus 3 more in `.env.example`, plus 5 read-but-undocumented | MISSING |
| 270 | `FRONTEND_URL` a single URL | comma-separated allowlist, HTTPS-enforced in prod | MISSING |
| 554 | "npm test must pass" | 2 ui specs; nothing enforces it | MISSING |

**Add:** Recovery, Winterization, About registry; `inquiry` row; four-endpoint upload section with both buckets; env-var section incl. the five missing from `.env.example`; a "what CI does not do" note.

### 2.2 `docs/ARCHITECTURE.md` (1429 lines, last touched 2026-06-21)

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 5–6 | verified against `25468a6` (2026-06-21) | HEAD `d93b258`; PRs #109–#114 landed since | STALE |
| 92 | `csd-fund-static` holds "uploaded images" | it holds the Angular browser bundle; contradicts its own 728–736 | WRONG |
| 130 | local DB `postgresql@14` | README says `@16` | WRONG |
| 217 | `/api/about` = sections + documents | sections only | STALE |
| 224 | upload = "presigned PUT URLs" | 4 endpoints, 3 POST, plus presigned GET | WRONG |
| 246 | render modes (2 listed) | also `** → Server`; no prerendering at all | MISSING |
| 278–622 | ER diagram, 21 entities | **8 tables missing**: recovery_forms, recovery_form_damages, winterization_forms, winterization_form_needs, form_number_sequences, needs_form_attachments, needs_form_audit_log, about_document_files | MISSING |
| 589–603 | `ABOUT_DOCUMENT` with 5-value enum + `fileUrl` | varchar(32) with 10 values; `code`, `access_mode`, `next_review_date` added; `file_url` → `legacy_file_url` | WRONG |
| 624 | "21 `@Entity` classes" | 29 | WRONG |
| 645 | "All pages are SSR-rendered" | `activity-map` is `RenderMode.Client` | WRONG |
| 668 | guards = Jwt + Roles | also `TurnstileGuard` on 3 routes | MISSING |
| 682 | WASH admin "exports to CSV" | XLSX, 6 sheets | WRONG |
| 628–711 | 6 feature sections | 3 whole features undocumented | MISSING |
| 742/781 | "CloudWatch 30-day retention by default" | no retention configured → never expires. Also no alarms, no X-Ray | WRONG |
| 779 | IAM = `PutObject` on `csd-media/*` only | also `PutObject`+`GetObject` on the private bucket | WRONG |
| 815–820 | prod-only env list | omits 3 vars; `DB_PORT` hardcoded `'5432'`; no VPC, no plugins | WRONG |
| 838–850 | frontend env = `{production, apiUrl}` | also `turnstileSiteKey`, `winterizationHouseholdEnabled` | WRONG |
| 888/898 | "log in with the seeded super_admin" after `run-seeds-standalone` | that script seeds equipment only; contradicts 900–916 | WRONG |
| 926–943 | backend command table | `verify` chain wrong; missing `lint:check`, `seed:about-documents` | WRONG |
| 954 | ui `verify` = typecheck+lint+format:check+test:ci | also `build`; and `format:check` is **SCSS only** | WRONG |
| 989 | "zero downtime via Lambda versioning" | no versioning/alias config anywhere | WRONG |
| 1046/1050 | sanitization covers procurement, vacancy, blog, content — "defense in depth" | only procurement + vacancy | WRONG |
| 1140 | "hard deletes are strictly gated" | recovery/winterization delete is ungated | WRONG |
| 1143 | "audit log is WASH-only" | shared `needs_form_audit_log` exists | WRONG |
| 1313 | snapshot "OVERDUE as of 2026-05-17" | 2.5 months further overdue | STALE |
| 1329 | tech debt "[ ] CSP header on the frontend" | already deployed Report-Only (contradicts 1145); real item is promotion to enforce | WRONG |
| 1335 | "WASH restructuring is the next initiative" | Recovery, Winterization and About registry shipped since | STALE |

**Add:** §7.x for each of the three features; 8 ER-diagram tables + corrected `ABOUT_DOCUMENT`; a media-bucket / upload matrix under §8; "what CI does not run"; the sanitization gap and ungated deletes in §14.2; reconcile the CSP items.

### 2.3 `docs/MEDIA-UPLOADS.md` (129 lines, last touched 2026-05-22) — ✅ **rewritten in pass C**

The most out-of-date document relative to its own subject. It describes a world with one bucket and two endpoints.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 1/3 | scope = `csd-media` | two buckets; the private one is ignored entirely | WRONG |
| 8 | "two upload flows, two endpoints" | four endpoints | WRONG |
| 10–13 | blog PUT + testimonial POST | missing `needs-presigned` (Turnstile, private) and `about-doc-presigned` (admin, private, PDF only) | MISSING |
| 23–28 | one size cap (5 MB) | needs photos 5 MB / docs 15 MB; about docs 4 MB; wider MIME map | MISSING |
| 34–72 | CORS for `csd-media` only | `s3-csd-media-private-cors.json` also exists and must be applied | MISSING |
| 76–82 | reads "go through CloudFront when configured" | never configured in prod → always direct S3 | STALE |
| 76–82 | public reads only | no coverage of the presigned-GET read path (about files, recovery/winterization attachments) | MISSING |
| 115–118 | `aws s3api put-bucket-lifecycle-configuration ... file://infra/s3-csd-media-lifecycle.json` | **that file does not exist** | WRONG |
| whole | — | no retention/PII statement for `media/needs/*`, which holds defect acts and photos | MISSING |

**Add:** four-row endpoint matrix; a private-bucket section (manual creation, CORS, IAM, no public-read policy); a presigned-GET section; a PII/retention section; fix or drop the lifecycle-file reference.

### 2.4 `CLAUDE.md` (110 lines, last touched 2026-07-03) — ✅ **rewritten in pass D**

Two further errors this table missed, both in the deployment section — see **§0.8**.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 9–17 | repo tree | omits `infra/`, `CONTRIBUTING.md`, `README.md`, `docs/tasks/` | MISSING |
| 40–48 | pre-commit = `lint && test` | canonical gate is `npm run verify`; backend `lint` runs `--fix` (mutates) | STALE |
| 53–57 | CI pipeline described | omits that no job runs lint/typecheck/tests, and no PR workflow exists | MISSING |
| 59–65 | prod resources | `csd-media-private` absent | MISSING |
| 94–98 | drift warning: README says `/complaint`, `/needs`, `/content`; About unmentioned | **all four already fixed** in README (lines 67, 74, 75, 78). The warning describes a state that no longer exists | WRONG |
| whole | — | never mentions Recovery, Winterization, About registry, `inquiry`, Turnstile, helmet, private bucket | MISSING |

### 2.5 `backend/CLAUDE.md` (155 lines, last touched 2026-07-03) — ✅ **rewritten in pass D**

The most stale document in the repo. It will actively mislead an agent.

**Revised.** The `about` row below is **backwards** — see **§0.8**. The Turnstile addition was also under-specified: the `X-Turnstile-Token` API Gateway CORS allowlist in `serverless.yml` is part of the contract.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 17 | e2e via `test/jest-e2e.json` | ~~file does not exist~~ — **now correct** since the merge (§0.5). It should additionally say the run needs Docker | — (OK) |
| 28 | `tsconfig.json # ESNext target` | `target: ES2023`, `module: nodenext` | WRONG |
| 30 | main.ts CORS hardcoded `localhost:4200` | CORS from `getFrontendOrigins()`; also `assertRequiredEnv()` + helmet first | STALE |
| 38 | `run-seeds.ts` runs **only** equipment | also about-documents | WRONG |
| 41–46 | 14 modules | 15 — `inquiry` absent | WRONG |
| 44 | `needs/` = WASH only | three form families, 27 routes, two audit-log entities | WRONG |
| 46 | about = "sections + documents (NOT mentioned in README)" | sections only since PR-D3; README **does** mention about (line 258) | WRONG |
| 113 | "public endpoints have no decorators" | 3 public routes carry `TurnstileGuard` | WRONG |
| 122–129 | ⚠ ValidationPipe prod/local asymmetry | **removed** — `lambda.ts:52` sets `forbidNonWhitelisted` | WRONG |
| 133 | both binary lists must be curated | `serverless.yml` now uses `'*/*'`; only `lambda.ts` needs curation | STALE |
| 146 | IAM = `csd-media/*` only | also private bucket, incl. `GetObject` | WRONG |

**Add:** Turnstile contract; `assertRequiredEnv` + helmet; full npm-script list (`verify`, `lint` vs `lint:check`, `seed:about-documents`; there is no `seed:equipment`); env vars missing from `.env.example`; `WINTERIZATION_HOUSEHOLD_ENABLED`; "known gaps not to fix blindly" (logged reset link, no Swagger/throttler/filters, broken `test:e2e`).

### 2.6 `ui/CLAUDE.md` (148 lines, last touched 2026-05-17) — ✅ **rewritten in pass D**

**Revised.** The Leaflet row is right about the runtime and wrong to imply the `angular.json` entries do not exist; two of the four entries in that array are real. See **§0.8** and §5 item 20.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 14 | Leaflet via `allowedCommonJsDependencies` | loaded from the **unpkg CDN** in `src/index.html`; not a dependency at all | WRONG |
| 41–44 | `core/services` = api + auth | also `language.service.ts`, `page-title.service.ts` | MISSING |
| 47 | 3 shared components | also `file-upload/`, `form-stepper/`, `turnstile/` | MISSING |
| 53–59 | features list | missing `not-found/`, `about/documents/`, `admin/about/*`, all recovery/winterization admin screens, `admin/inquiries` | MISSING |
| 56 | `needs/wash-form/` | three forms | WRONG |
| 96 | "**all** API calls through `ApiService`" | five admin lists use raw `fetch` for XLSX | STALE |
| 97–99/143 | "all guards and the interceptor check `isPlatformBrowser`; never touch localStorage directly" | those same five components call `localStorage.getItem('token')` unguarded | WRONG |
| 105–107 | environments export `apiUrl` only | also `turnstileSiteKey`, `winterizationHouseholdEnabled` | WRONG |
| 111–115 | "specs colocate with code" | exactly 2 spec files exist | MISSING |
| 119–123 | lint/format block | omits `typecheck`, `format:check` (SCSS only), `test:ci`, `verify` | MISSING |

**Add:** `LanguageService` is mandatory for language-dependent logic (35 files still read `translate.currentLang`; the app is zoneless); the two needs forms + Turnstile contract; the `/about` shell structure and the API split; the five unguarded-localStorage exports flagged as debt; the squatted `ngx-translate` dependency.

### 2.7 `backend/README.md` (318 lines, last touched 2026-05-17)

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 60–70 | "minimum required keys" = DB/JWT/NODE_ENV | omits `FRONTEND_URL` (boot-blocking in prod), `TURNSTILE_SECRET_KEY`, `AWS_S3_PRIVATE_BUCKET`, `WINTERIZATION_HOUSEHOLD_ENABLED` | MISSING |
| 95–98 | `runSeeds` "only invokes `seedEquipmentCatalog()`" | also `seedAboutDocuments()` | WRONG |
| 100–103 | two standalone scripts | also `seed-about-documents-standalone.ts` — the only way prod gets the registry | MISSING |
| 255–269 | 14 modules | 15 — `inquiry` absent | WRONG |
| 263 | needs = WASH | three form families | WRONG |
| 274 | "merges to main trigger the workflow" | trigger is `pull_request: closed` + `merged==true`, or `workflow_dispatch` | STALE |
| 288–292 | `test:e2e` "spins up a real NestJS instance" | ~~config file missing~~ — **now correct** since the merge (§0.5); it spins up `postgres:16-alpine` via Testcontainers and needs Docker | — (OK) |
| 296–301 | lint/format; "pre-commit enforcement in the repo root (if configured)" | nothing configured — no husky, no lint-staged | STALE |

### 2.8 `ui/README.md` (59 lines, last touched 2026-03-11)

Untouched Angular CLI 21.2.1 boilerplate. Contains no project-specific claim, therefore nothing to correct — **rewrite from scratch**, modelled on `backend/README.md`.

### 2.9 `CONTRIBUTING.md` (548 lines, last touched 2026-07-26) — ✅ **rewritten in pass D**

The most recently updated document, and still carries four outright fabrications.

**Revised.** Three rows below are **conditional findings that have since resolved** — `test.yml` is on `main`, so lines 248–249, 285–291 and 500 are now *true for the backend and false for `ui`*. One further §4 error this table missed: the backend `verify` chain was described without `check:cjs`. See **§0.8**. The `ReadingTimePipe` row applies only to line ~271; the three commit-message examples elsewhere were left alone deliberately.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 233 | ui `verify` includes `format:check` (implied general) | `format:check` is **SCSS only**; `verify` never format-checks ts/html | WRONG |
| 248–249 | backend e2e "needs Docker for Testcontainers" | **true of `feat/test-infrastructure`, not of `main`** — see §0.3. Not a fabrication; an unmerged branch described as current | STALE |
| 264 | "specs colocate, e.g. `auth.service.spec.ts`" | that file does not exist; ui has 2 specs total | WRONG |
| 268–274 | test targets incl. `ReadingTimePipe` | **`ReadingTimePipe` does not exist in the repo** | WRONG |
| 285–291 | e2e "spins up PostgreSQL 16 via Testcontainers and runs all migrations" | same as 248–249: real on the unmerged branch. Note the version detail is also wrong — local dev is PG **14**, prod is **16.13** | STALE |
| 459 | ValidationPipe strips silently in prod / rejects locally | asymmetry removed; both return 400 | WRONG |
| 500 | "not running lint before pushing breaks CI and blocks the PR" | false on `main` (the only workflow runs post-merge and never lints); **true once `feat/test-infrastructure` merges**, which adds `test.yml` PR Checks | WRONG / conditional |
| 171–172 | PR checklist "lint/test pass" | nothing enforces it | STALE |
| 467 | anonymous endpoints listed | also `POST /upload/testimonial-presigned`; 3 routes are Turnstile-guarded | STALE |
| 480 | CORS "configured in `main.ts`" | in the shared `common/frontend-urls.ts`, used by both entry points | STALE |
| 494 | localStorage/SSR rule | correct rule, but five committed components already violate it | MISSING |

### 2.10 `infra/SECURITY-HEADERS.md` (108 lines) — ✅ **rewritten in pass C**

**Revised.** See **§0.7** for the one row below (the whole-file MISSING) that was too broadly worded. This document is *accurate about the live state* — its allowlist table matches the header served by production. The drift is in the repository JSON, which contains an unapplied update. See §0.1.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 41–53 | allowlist table without Turnstile or the private bucket | matches the **live** header exactly — correct as a record of production | — (verified OK) |
| 39 | CSP "ships Report-Only first, switch after the console is clean" | still Report-Only on 2026-07-29. Reads as a plan and records no current state or date | STALE |
| 41–53 | no `default-src` row | live CSP starts `default-src 'self'` | MISSING |
| 59–99 | enforce procedure needs `<POLICY_ID>`, never recorded | ID is `0dfcb167-3b72-4c89-8574-0465ee42283c`, name `csd-frontend-security-headers` (matches the JSON), attached to all 10 cache behaviours — §0.2 | MISSING |
| 69–73 | "attach the policy to every behavior" (as an instruction) | **done** — all 10 behaviours carry it. Record it as completed state, not as a pending step | STALE |
| whole | — | **Does not warn that switching to enforce today breaks the Recovery and Winterization forms and the About registry** — the live CSP has no `challenges.cloudflare.com` and no `csd-media-private` entries. `cloudfront-response-headers-policy.json` already contains the fix but it was never applied to AWS. This is the single most consequential gap in the whole audit | MISSING |
| 81–86 | Report-Only verification checklist | omits `/needs/recovery-form`, `/needs/winterization-form`, `/about/documents` — the pages that require the unapplied entries | MISSING |

---

## 3. Cross-document contradictions — RESOLVED 2026-07-29

Settled with Vasyl against live systems. Apply these verbatim; do not re-litigate them per file.

### 3.1 PostgreSQL versions — **local 14, production 16**

> Local development runs PostgreSQL **14** (Homebrew `postgresql@14`, port 5432, client 14.19).
> Production runs PostgreSQL **16.13** on RDS `csd-postgres`.

`backend/README.md:20-21`, `docs/ARCHITECTURE.md:130,863` and `backend/.env.example:2` are already correct. **Only the root `README.md` was wrong** — ~~in seven places: lines 24, 45, 195, 196, 199, 387, 572~~ **in five** (the Homebrew lines only). See **§0.6** for the correction and **§0.7** for what pass B actually changed. ✅ **Fixed in pass B.**

The Docker path is *not* part of this: `postgres:16` mapped to host 5433 is the documented Docker alternative in `ARCHITECTURE.md:143,1292` and `backend/README.md:31`, and the root README's Docker blocks (macOS and Windows) were already consistent with it.

Two facts to add while there:

- `postgresql@15` is installed locally but not started. If it ever starts it contends for port 5432 — the exact cause of Incident #1 (`ARCHITECTURE.md:1151`). Worth a line in the troubleshooting section.
- **Dev/prod major-version skew (14 → 16) is undocumented.** Migrations are authored and tested on 14 and applied to 16. Add this to `ARCHITECTURE.md` §13 (Database Migrations) and §17 (Technical Debt).

### 3.2 Procurement form step count — **7**

`ui/src/app/features/cooperation/procurement/procurement-form.ts:905` → `readonly totalSteps = 7`. Steps: Info · Method · Technical · Timeline · Evaluation · Documents · Review.

`ARCHITECTURE.md:690` is correct. **`README.md:71` is wrong** — fix that one line.

### 3.3 CSP status — **live, Report-Only, and the repo fix is unapplied**

Verified against the live header on 2026-07-29 (§0.1). Write it as:

> The CloudFront response-headers policy `csd-frontend-security-headers` (`0dfcb167-3b72-4c89-8574-0465ee42283c`) is deployed on distribution `E3U465AMSVR9PN` and attached to all 10 cache behaviours. The CSP is served as **`Content-Security-Policy-Report-Only`** — it reports violations and blocks nothing.
>
> `infra/cloudfront-response-headers-policy.json` contains an updated CSP that has **not** been applied to AWS. It adds `challenges.cloudflare.com` (Turnstile) and `csd-media-private` (needs-form uploads, About registry). **Applying it is a prerequisite for switching to enforce** — without it, enforce breaks the Recovery form, the Winterization form and the About document registry.

This resolves the `ARCHITECTURE.md:1145` ↔ `1329` contradiction: 1145 is right that the policy is deployed, 1329 is right that work remains. Replace both with the statement above, and move the remaining work into §17 as two items: *apply the prepared JSON*, then *promote to enforce*.

### 3.4 Seeding — **equipment + about-documents, local only**

Verified in code:

> `runSeeds()` (`backend/src/database/run-seeds.ts`) calls `seedEquipmentCatalog()` and `seedAboutDocuments()`, in that order. It is invoked from exactly one place — `main.ts:44`, after `app.listen()`. `lambda.ts` never calls it, so **seeds never run in production**; the About registry is seeded on demand with `npm run seed:about-documents`.
>
> `seed-super-admin.ts` is standalone and is not part of the bootstrap chain — it runs only via `npm run seed:super-admin`. There is **no locations seed**; `README.md:47` invented it.

Correct: `README.md:47,83`, `ARCHITECTURE.md:207,888,898`, `backend/CLAUDE.md:38`, `backend/README.md:95`.

### 3.5 Canonical command list — **`CONTRIBUTING.md` §4 is the authority**

It already carries the most accurate copy (`verify` chains for both apps) and is the most recently maintained document. Everywhere else, replace the duplicated command tables with a short "day-to-day" subset plus a link to `CONTRIBUTING.md` §4.

The one caveat that must appear wherever `verify` is mentioned: **`ui`'s `format:check` covers SCSS only**, so `verify` never format-checks `.ts` or `.html`, even though `npm run format` rewrites all three.

### 3.6 Test infrastructure — ~~merge first~~ **DONE, merged as `dfac315`**

**Superseded by §0.5.** The branch is merged; `main` is at `1c1030f`. Document the merged reality: `test.yml` PR Checks (backend only), Testcontainers e2e on `postgres:16-alpine`, the `InitialSchema` self-detecting baseline, and the `!test/jest-e2e.json` negation.

The finding that *replaces* the two retired ones: **`test.yml` has a single `backend` job, so the entire `ui` app is still ungated pre-merge.** Say that explicitly wherever CI is described — a reader who sees "PR Checks" on a green PR will otherwise assume the frontend was checked.

---

## 4. Suggested rewrite order

Sequenced so that later documents can cite earlier ones instead of duplicating them.

| Pass | Documents | Why this order |
| --- | --- | --- |
| A ✅ | `docs/ARCHITECTURE.md` — **done 2026-07-29 at `1c1030f`** | Largest, and the natural home for the three new feature sections and the ER diagram. Everything else can link to it. |
| B ✅ | `README.md`, `backend/README.md`, `ui/README.md` — **done 2026-07-29 at `6d84d64`** | Entry points. `ui/README.md` was a from-scratch write. |
| C ✅ | `docs/MEDIA-UPLOADS.md`, `infra/SECURITY-HEADERS.md` — **done 2026-07-31 at `4ee8195`** | Narrow and factual, but not mechanical: both were rescoped, and one audit claim had to be narrowed (§0.7). |
| D ✅ | `CLAUDE.md` ×3, `CONTRIBUTING.md` — **done 2026-07-31 at `e5a4578`** | Agent- and contributor-facing, so written last: they point at the corrected documents rather than restating them. `CONTRIBUTING.md` §4 was re-derived line by line against both `package.json` files. |

~~Passes C and D can run in parallel once A is done.~~ They ran in sequence, C then D. **All four passes are complete** — see the banner at the top of this file.

---

## 5. Re-verification

Before quoting any figure from this file, re-run the command in §1.1 — §1 is a snapshot of `d93b258`, corrected at `1c1030f` in §0.5, and neither is a live view. If a document and this audit disagree, check the code; if the code and this audit disagree, the code wins and this file should be corrected.

**Decisions settled in pass A**, recorded here so passes B–D stay consistent and do not re-litigate them:

1. **PostgreSQL:** local dev **14**, e2e Testcontainers **16-alpine**, production **16.13**. The skew is documented, not fixed. `ARCHITECTURE.md` §4 and §13 carry it.
2. **Procurement form: 7 steps.** `ARCHITECTURE.md` was already right; only `README.md:71` needs fixing (pass B).
3. **CSP:** `ARCHITECTURE.md` §14.3 now holds a single "CSP status — single source of truth" block, and the old §17 "CSP header on the frontend" item is replaced by two ordered items: *apply the prepared JSON*, then *promote to enforce*. **Other documents should link to that block rather than restating it.**
4. **Seeding:** equipment + about-documents, via `main.ts` only; never in production; About registry reaches prod only via `npm run seed:about-documents`. No super-admin seed in the bootstrap chain, no locations seed at all.
5. **Commands:** `CONTRIBUTING.md` §4 remains the canonical reference. `ARCHITECTURE.md` §11 now says so explicitly and keeps only a day-to-day subset plus the load-bearing scripts (`check:cjs`, `verify:prod-baseline`, `seed:about-documents`).
6. **Feature sections live in `ARCHITECTURE.md`** as §7.7 (Recovery), §7.8 (Winterization), §7.9 (About registry) and §7.10 (shared needs infrastructure). Existing numbering 7.1–7.6 was preserved. **Passes B–D should link to these, not duplicate them.**
7. **The upload/bucket matrix lives in `ARCHITECTURE.md` §8.1** — four endpoints, three buckets, presigned POST vs PUT, size caps, MIME lists. `MEDIA-UPLOADS.md` (pass C) should build on it rather than restate it.
8. **Incident #4 is recorded in `ARCHITECTURE.md` §15** (the `sanitize-html` / `htmlparser2` ESM outage and the `check:cjs` mitigation). `CONTRIBUTING.md` (pass D) should point at it when explaining the dependency policy.

**Decisions settled in pass B**, for passes C and D:

9. **The three READMEs link, they do not restate.** Root `README.md` gained §2.1 (three-paragraph feature summaries → `ARCHITECTURE.md` §7.7–§7.9), §2.2 (a two-table bucket/endpoint summary → §8.1) and §2.3 (env vars → §9). Each is a *pointer with enough detail to act on*, not a duplicate. Passes C and D should do the same, and should not re-summarise the features again.
10. **"What CI does and does not do" now lives in three places by design** — `ARCHITECTURE.md` §12 (full), root `README.md` §1.1 (table + the ui-is-ungated warning), and each app's README (its own half). The invariant sentence to reuse verbatim: *`test.yml` has exactly one job, `backend`; the entire `ui` app is ungated pre-merge.*
11. **`ui/README.md` is now a real document** (~250 lines) and is the home for frontend specifics: render modes, npm scripts, the SSR `X-Forwarded-*` hardening, the language rule, the Leaflet-from-CDN fact and a "Known debt" section. `ui/CLAUDE.md` (pass D) should point at it rather than repeat it, and should keep only the *rules an agent must not break*.
12. **Prose documents carry no `// CHANGED:` markers.** Pass A set this precedent in `ARCHITECTURE.md` and pass B followed it. The convention applies to code; in Markdown the diff is the record. Do not add them in passes C and D.

**Decisions settled in pass C**, for pass D:

13. **`MEDIA-UPLOADS.md` is the operational document, `ARCHITECTURE.md` §8.1 is the canonical one.** §8.1 answers *what exists*; `MEDIA-UPLOADS.md` answers *how to run it* — manual bucket creation, the CORS commands, the error responses, the retention/PII position. Its endpoint matrix is deliberately not a copy of §8.1's: it carries the literal MIME strings, the exact key prefixes and, in a second table, **which constants file owns each rule** (`recovery.constants.ts`, `winterization.constants.ts`, `about-documents.constants.ts`), because that is what a reader changing a limit actually needs. Pass D should link to `MEDIA-UPLOADS.md` for procedure and to §8.1 for facts.
14. **`SECURITY-HEADERS.md` owns the CSP *procedure*; `ARCHITECTURE.md` §14.3 owns the *status*.** The document now opens with a §0 "current state" table (policy ID, distribution, attachment count, Report-Only) and the blocking-prerequisite warning, then the allowlist table, then apply/verify/enforce runbooks with the policy ID inlined so they are executable. It links to §14.3 for status rather than restating it.
15. **Live-AWS facts carry a `†` and a re-check command**, following the pattern root `README.md` §1 set for the Database table. In pass C that covers the policy ID, the distribution, the 10-behaviour attachment count, the Report-Only status and the JSON-vs-live divergence — none of which is derivable from the repository. Pass D must not restate any of them as repo facts; point at `SECURITY-HEADERS.md` §0.
16. **`unpkg.com` is load-bearing and must be labelled as such wherever the CSP is discussed.** Leaflet and `leaflet.markercluster` are loaded by `<script>`/`<link>` in `ui/src/index.html` and are not npm dependencies (`map-view.ts` reads `window.L`), so `script-src`, `style-src` **and** `img-src` (marker images referenced from the unpkg CSS) all need the host. Removing it from the CSP is a frontend change — move Leaflet into `package.json` first.

**Decisions settled in pass D** — the last pass:

17. **The three `CLAUDE.md` files hold only the rules an agent must not break.** Everything descriptive moved out or became a pointer: module inventories and env vars → `ARCHITECTURE.md`, setup and known gaps → the app READMEs, commands → `CONTRIBUTING.md` §4. The editorial test applied throughout was *"would an agent that believes this line make a wrong edit?"* — a merely incomplete line stays, a confidently wrong one goes. Hence each file now ends in a "Don'ts" section and carries a "known gaps — do not fix blindly" list: the failure mode for an agent is not ignorance, it is helpfulness aimed at a deliberate decision.
18. **The root `CLAUDE.md` drift warning is replaced by a "Documentation state" table, not by a corrected list of stale claims.** A per-claim list is exactly what went wrong the first time — it was accurate for about six weeks, then became a warning about staleness that was itself stale. The table names each document, what it owns and the commit it was last verified against, and defers to §5 here for the decisions. It asserts no specific fact about the code, so it can only rot in one column.
19. **Where a claim is true of one app and false of the other, both halves go in the same sentence.** Three of these bit earlier passes: backend `lint` mutates / `ui`'s does not; `test.yml` gates the backend / leaves `ui` ungated; `ui`'s `format:check` is SCSS-only / the backend has none at all. Each had previously been written as one generalised claim, and each generalisation was wrong. Do not compress them back.
20. **The Leaflet entry in `angular.json` is documented as simultaneously live config and dead config.** `ui/CLAUDE.md` states that the `allowedCommonJsDependencies` entries exist, that neither package is an npm dependency, that the runtime comes from unpkg via `index.html`, that `quill`/`quill-delta` in the same array *are* real and load-bearing, and that removing the two dead entries is safe but separate. Stating only one half — as §2.6 and the original `ui/CLAUDE.md` did, in opposite directions — sends a reader either to install a package the app does not want or to strip a CSP entry the map needs.
