# Security headers — CloudFront and the API

> **Location:** `infra/SECURITY-HEADERS.md`
> **Scope:** the *procedure* — the CSP allowlist and why each entry exists, how to apply the policy, how to verify it, and how to promote it to enforce.
> **Status of record** lives in [`docs/ARCHITECTURE.md` §14.3](../docs/ARCHITECTURE.md#csp-status--single-source-of-truth) and is not repeated here.
> **Last verified against code:** 2026-07-31 (commit `4ee8195`) · **live AWS values verified:** 2026-07-29

Originally written as "Batch 1". Two independent pieces, deployed separately:

1. **Backend (helmet)** — in code, ships with every backend deploy.
2. **Frontend (CloudFront response-headers policy)** — manual, applied by hand, **not** touched by any pipeline.

---

## 0. Current state — read this first

| | Value | Source |
| --- | --- | --- |
| Policy name | `csd-frontend-security-headers` | matches `cloudfront-response-headers-policy.json:2` |
| Policy ID | `0dfcb167-3b72-4c89-8574-0465ee42283c` | **live AWS** † |
| Distribution | `E3U465AMSVR9PN` (`www.csd-fund.org`) | live AWS † |
| Attached to | the default cache behaviour **and all 9 additional behaviours** (10 total) | live AWS † |
| CSP header | **`Content-Security-Policy-Report-Only`** — reports, blocks nothing | live AWS † |
| Repo JSON vs. live | the JSON contains an **updated CSP that was never applied** | live AWS † |

† **Not derivable from this repository.** No pipeline applies this policy, and the
ID is not in `cloudfront-response-headers-policy.json` or any other config — it
exists only in prose (this page, `docs/ARCHITECTURE.md` §8/§14.3, `README.md`,
`docs/DOC-AUDIT.md`), all of it copied from the same reading. All five values were
read from live AWS on **2026-07-29**. Re-check before relying on them:

```bash
# What production actually serves right now
curl -sI https://www.csd-fund.org/ | grep -i 'content-security\|strict-transport\|referrer-policy'

# The policy as AWS holds it (also returns the ETag you need to update it)
aws cloudfront get-response-headers-policy --id 0dfcb167-3b72-4c89-8574-0465ee42283c

# Which behaviours carry it — expect the default plus 9 entries
aws cloudfront get-distribution-config --id E3U465AMSVR9PN \
  --query "DistributionConfig.{default:DefaultCacheBehavior.ResponseHeadersPolicyId, others:CacheBehaviors.Items[].ResponseHeadersPolicyId}"
```

The table in §2.1 below describes the **live** header. It is correct.
`cloudfront-response-headers-policy.json` is the file that is out of step — it is
a prepared, unapplied fix. **Do not "sync" the table to the JSON.**

### ⛔ Blocking prerequisite before enforce

The live CSP allows neither `https://challenges.cloudflare.com` (Cloudflare
Turnstile) nor `https://csd-media-private.s3.eu-central-1.amazonaws.com` (needs-form
attachments, About registry PDFs). Nothing breaks today **only** because the
header is `Report-Only`. Promote it as-is and the following break immediately:

| What breaks | Directive | Why |
| --- | --- | --- |
| **Recovery form** (`/needs/recovery-form`) | `script-src`, `frame-src` | `turnstile.ts` injects `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit">` and the widget renders a Cloudflare iframe. No script → no token → `TurnstileGuard` answers **403** on both submit and upload |
| **Winterization form** (`/needs/winterization-form`) | `script-src`, `frame-src` | same component, same guard |
| Attachment upload on both forms | `connect-src` | `file-upload.ts` does `fetch(presigned.url, {method:'POST'})` straight to `csd-media-private` |
| **About registry admin upload** (`/admin/about/documents/…`) | `connect-src` | `document-files.ts` posts to `csd-media-private` the same way — no new document can be published |
| Admin attachment previews (recovery / winterization detail) | `img-src` | thumbnails and the lightbox render `<img [src]="presigned GET on csd-media-private">` |

`infra/cloudfront-response-headers-policy.json` already contains exactly these
additions. **Applying it is a prerequisite for enforce, not an optional tidy-up.**
Order of operations: apply (§2.4) → verify Report-Only is clean (§2.5) → promote
(§2.6).

One deliberate piece of precision, because it will otherwise be mis-read: the
**public** `/about/documents` page survives enforce today. It calls
`GET /api/about/documents/:code/file` (same allowlisted API host) and then
`window.open(url)` — a top-level navigation, which no CSP fetch directive
governs. That is a property of the current implementation, not of the policy:
PR-D4 replaces `window.open` with an in-app viewer, and the moment it lands the
public page needs `csd-media-private` in the CSP too. Add the entry now.

---

## 1. Backend — helmet

Applied by both bootstraps, so local and Lambda behave identically.

| File | Role |
| --- | --- |
| `backend/src/common/security-headers.ts` | the single helmet config (shared-helper pattern, like `frontend-urls.ts`) |
| `backend/src/common/security-headers.spec.ts` | unit test pinning the exact header output |
| `backend/lambda.ts:39` | `app.use(securityHeaders())` before CORS — prod path |
| `backend/src/main.ts:21` | same, local path |
| `backend/package.json` | `helmet@^8.2.0` |

The API serves only JSON and binary (no HTML, no Swagger), so its own CSP is
locked shut: `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.
HSTS here is `max-age=15552000; includeSubDomains` (180 days) — the authoritative,
longer HSTS for the public domain comes from CloudFront. helmet's defaults add
`nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`,
COOP/CORP `same-origin`, `X-Permitted-Cross-Domain-Policies: none`, and drop
`X-Powered-By`. COEP stays **off** — enabling it breaks legitimate cross-origin
loads. CORP `same-origin` does **not** block the SPA: CORS governs the SPA's
`fetch`, CORP only blocks no-cors embedding.

Verify after any backend deploy:

```bash
curl -sI https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod/api/health
# expect: content-security-policy: default-src 'none'; base-uri 'none'; ...
#         strict-transport-security, x-content-type-options: nosniff,
#         x-frame-options: SAMEORIGIN, referrer-policy: no-referrer
#         and NO x-powered-by
```

---

## 2. Frontend — CloudFront response-headers policy

Policy config: [`cloudfront-response-headers-policy.json`](./cloudfront-response-headers-policy.json).

### 2.1 CSP allowlist — why each entry exists

This is the **live** header, directive by directive. Entries the prepared JSON
adds but AWS has not yet received are marked **`JSON only`**.

| Directive | Value | Reason (from the code) |
| --- | --- | --- |
| `default-src` | `'self'` | Fallback for every fetch directive not listed below. Everything else in this table is an exception to it — which is why a missing host fails closed rather than falling through to `*`. |
| `script-src` | `'self' 'unsafe-inline' https://unpkg.com`<br>**`JSON only`**: `https://challenges.cloudflare.com` | App bundle = self; **Leaflet + markercluster from `unpkg.com`** (see §2.2); `'unsafe-inline'` is required by Angular's `withEventReplay()` hydration inline script — a static CloudFront policy cannot issue per-request nonces. Turnstile loads its API script from `challenges.cloudflare.com` (`shared/components/turnstile/turnstile.ts`). |
| `style-src` | `'self' 'unsafe-inline' https://unpkg.com` | Angular inlines component styles during SSR; **Leaflet + MarkerCluster CSS from `unpkg.com`**. |
| `img-src` | `'self' data: blob: https://i.ytimg.com https://*.basemaps.cartocdn.com https://unpkg.com https://csd-media.s3.eu-central-1.amazonaws.com`<br>**`JSON only`**: `https://csd-media-private.s3.eu-central-1.amazonaws.com` | YouTube thumbnails; Carto map tiles (`map-view.ts:287`); **Leaflet marker images, referenced by the unpkg CSS**; public uploaded media — direct S3, because `AWS_CLOUDFRONT_MEDIA_URL` is **not** set in `backend/serverless.yml`; `blob:`/`data:` for in-browser previews. The private host is needed for admin attachment previews. |
| `connect-src` | `'self' https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com https://csd-media.s3.eu-central-1.amazonaws.com`<br>**`JSON only`**: `https://csd-media-private.s3.eu-central-1.amazonaws.com`, `https://challenges.cloudflare.com` | REST API (`environment.prod.ts`); presigned uploads go browser → S3 directly (`docs/MEDIA-UPLOADS.md` §8). The private host carries the needs-form and About-registry uploads. `challenges.cloudflare.com` is in the JSON defensively — the widget does its own network calls from inside its iframe, which the parent policy does not govern, but its bootstrap script runs in the page context and Cloudflare's own guidance lists the directive. |
| `frame-src` | `'self' https://www.youtube.com`<br>**`JSON only`**: `https://challenges.cloudflare.com` | Lazy YouTube `/embed` iframes (`home.ts`, `blog-post.ts`); the Turnstile widget is an iframe. |
| `font-src` | `'self' data:` | No web-font CDN in use. |
| `frame-ancestors` | `'self'` | Clickjacking protection (modern replacement for X-Frame-Options). Does not affect us embedding YouTube. |
| `base-uri` / `object-src` / `form-action` | `'self'` / `'none'` / `'self'` | Standard hardening. |
| `upgrade-insecure-requests` | — | All subresources are already HTTPS; this is a backstop. |

> If a Report-Only violation names a media host other than
> `csd-media.s3.eu-central-1.amazonaws.com` (older posts, say), add it to `img-src`.
> If `AWS_CLOUDFRONT_MEDIA_URL` is ever set on the backend, swap the S3 host for
> that CDN domain in **both** `img-src` and `connect-src`.

### 2.2 `unpkg.com` is load-bearing — do not remove it

`ui/src/index.html` loads Leaflet and `leaflet.markercluster` from the unpkg CDN
with plain `<script>` and `<link>` tags:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="…" crossorigin="" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="…" crossorigin=""></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

**Neither is an npm dependency** — only the `@types` are installed, and
`map-view.ts` reads the library off `window.L` at runtime. So `unpkg.com` in
`script-src`, `style-src` and `img-src` is not a leftover from an old build
setup: drop any one of the three and `/activity-map` stops working, silently in
the SSR case because that route is `RenderMode.Client`. The marker images are the
non-obvious one — they are referenced by URL from the unpkg-hosted CSS, which is
why `img-src` needs the host too.

If you want to remove `unpkg.com` from the CSP, the prerequisite is moving
Leaflet into `package.json` and importing it properly. That is a frontend change,
not a header change.

### 2.3 Create the policy (first time only — it already exists)

**CLI (preferred — reuses the committed JSON):**

```bash
aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json
# record the returned .ResponseHeadersPolicy.Id — it lives in no committed file
```

**Console:** CloudFront → Policies → Response headers → Create, filling from the
JSON: HSTS `max-age=63072000` + includeSubDomains, preload off; nosniff;
X-Frame-Options SAMEORIGIN; Referrer-Policy `strict-origin-when-cross-origin`;
X-XSS-Protection `0`; one custom header, `Content-Security-Policy-Report-Only`,
set to the CSP string.

**Attach:** Distributions → `E3U465AMSVR9PN` → Behaviors → for **every** behaviour
→ Edit → Response headers policy → `csd-frontend-security-headers`. This was done
and all 10 behaviours carry it †, so a future flip to enforce applies consistently
rather than partially. No invalidation needed — a response-headers policy is
applied at the edge on every response, including cached objects.

### 2.4 Apply an edited JSON

The pipeline never does this. After editing the file:

```bash
# 1. Read the current policy — you need its ETag
aws cloudfront get-response-headers-policy --id 0dfcb167-3b72-4c89-8574-0465ee42283c

# 2. Push the committed JSON
aws cloudfront update-response-headers-policy \
  --id 0dfcb167-3b72-4c89-8574-0465ee42283c \
  --if-match <ETag-from-step-1> \
  --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json

# 3. Confirm the edge is serving it
curl -sI https://www.csd-fund.org/ | grep -i content-security
```

### 2.5 Verification checklist (Report-Only)

```bash
curl -sI https://www.csd-fund.org | grep -iE 'strict-transport|content-type-options|frame-options|referrer-policy|content-security'
```

Then in a browser (DevTools → Console), walk every CSP-relevant path and confirm
**no** `[Report Only]` violations. The three **bold** rows are the ones the live
header cannot satisfy until §2.4 has been run — treat a violation there as
expected-until-applied, and as a hard blocker for enforce:

| Path | What it exercises |
| --- | --- |
| `/` and `/activity-map` | Carto tiles, Leaflet script + CSS + marker images from unpkg |
| `/blog/:slug` | S3 media images, YouTube thumbnail and `/embed` iframe |
| `/admin` login → blog image upload | presigned PUT to `csd-media`, `blob:` preview |
| Language switch UA/EN | no CSP surface of its own; catches inline-style regressions |
| **`/needs/recovery-form`** | Turnstile script + iframe, presigned POST to `csd-media-private`, 3–10 photo uploads |
| **`/needs/winterization-form`** | same widget and upload path, second form |
| **`/about/documents`** and `/admin/about/documents/:id` | public file link (navigation — no violation expected today, see §0) and the **admin PDF upload**, which posts to `csd-media-private` |

Also open an admin recovery or winterization detail view with attachments — the
thumbnails are `<img>` tags pointing at presigned GETs on the private bucket, and
they are the `img-src` half of the problem.

### 2.6 Promote to enforce

Only after §2.4 has been applied **and** §2.5 is clean for a few days of real
traffic. Doing this before applying the JSON breaks the two needs forms and the
About admin upload — see §0.

```bash
# 1. In infra/cloudfront-response-headers-policy.json, rename the custom header:
#    "Content-Security-Policy-Report-Only"  →  "Content-Security-Policy"

# 2. Same update call as §2.4
aws cloudfront get-response-headers-policy --id 0dfcb167-3b72-4c89-8574-0465ee42283c
aws cloudfront update-response-headers-policy \
  --id 0dfcb167-3b72-4c89-8574-0465ee42283c \
  --if-match <ETAG> \
  --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json

# 3. Re-run the whole of §2.5 — violations now block instead of logging
curl -sI https://www.csd-fund.org/ | grep -i content-security
```

No re-attach is needed; the behaviours point at the policy ID, not at its
contents. **Rollback** is the same call with the header renamed back — one
`update-response-headers-policy`, effective at the edge within a minute or two,
no deploy and no invalidation.

Both steps are tracked as separate items in `ARCHITECTURE.md` §17, in this order.

---

## Out of scope (candidates for later)

- **Nonce-based CSP** (dropping `script-src 'unsafe-inline'`): requires moving CSP generation into the SSR Lambda (`ui/src/server.ts` + Angular `CSP_NONCE`) so each response gets a fresh nonce. A static CloudFront policy cannot do this.
- **`Permissions-Policy`**: deferred — a restrictive value must still delegate `fullscreen`/`encrypted-media`/`autoplay` to `https://www.youtube.com`, and `challenges.cloudflare.com` is sensitive to a blanket policy too. Worth adding with those caveats.
- **HSTS `preload`**: only after confirming every `csd-fund.org` subdomain is HTTPS, then submit to hstspreload.org.
- **`report-to` / `report-uri`**: add a collector endpoint if CSP reports should be server-side rather than console-only. Report-Only without a collector means violations are only seen by whoever happens to have DevTools open — which is why §2.5 is a manual walk-through rather than a query.
