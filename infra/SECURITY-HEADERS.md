# Batch 1 — Security headers

Two independent pieces, deployed separately:

1. **Backend (helmet)** — already implemented in code, ships with the next backend deploy.
2. **Frontend (CloudFront Response Headers Policy)** — manual one-time setup in AWS, no redeploy.

---

## 1. Backend — helmet (done in code)

| File | Change |
| --- | --- |
| `backend/src/common/security-headers.ts` | New — single helmet config (shared-helper pattern, like `frontend-urls.ts`). |
| `backend/src/common/security-headers.spec.ts` | New — unit test pinning the exact header output. |
| `backend/lambda.ts` | `app.use(securityHeaders())` before CORS (prod path). |
| `backend/src/main.ts` | same, for the local path. |
| `backend/package.json` | `helmet@^8.2.0`. |

The API serves only JSON/binary (no HTML, no Swagger), so its CSP is locked to `default-src 'none'`. helmet defaults also add `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, COOP/CORP `same-origin`, `X-Permitted-Cross-Domain-Policies: none`, and drop `X-Powered-By`. COEP stays **off** (enabling it breaks cross-origin loads). CORP `same-origin` does **not** block the SPA — CORS governs the SPA's `fetch`, CORP only blocks no-cors embedding.

Verify after deploy:

```bash
curl -sI https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod/api/health
# expect: content-security-policy: default-src 'none'; ...
#         strict-transport-security, x-content-type-options: nosniff,
#         x-frame-options: SAMEORIGIN, referrer-policy: no-referrer
#         and NO x-powered-by
```

---

## 2. Frontend — CloudFront Response Headers Policy

Policy config: [`cloudfront-response-headers-policy.json`](./cloudfront-response-headers-policy.json).
Distribution: **E3U465AMSVR9PN** (`www.csd-fund.org`).

The CSP ships as **`Content-Security-Policy-Report-Only`** first — it reports violations to the browser console without blocking anything. Switch to enforce only after the console stays clean.

### CSP allowlist — why each entry exists

| Directive | Value | Reason (from the code) |
| --- | --- | --- |
| `script-src` | `'self' 'unsafe-inline' https://unpkg.com` | App bundle = self; Leaflet + markercluster from `unpkg.com` (`index.html`); `'unsafe-inline'` is required by Angular `withEventReplay()` hydration inline script (a static CloudFront policy can't issue per-request nonces). |
| `style-src` | `'self' 'unsafe-inline' https://unpkg.com` | Angular inlines component styles during SSR; Leaflet CSS from `unpkg.com`. |
| `img-src` | `'self' data: blob: https://i.ytimg.com https://*.basemaps.cartocdn.com https://unpkg.com https://csd-media.s3.eu-central-1.amazonaws.com` | YouTube thumbnails (`i.ytimg.com`); map tiles (`cartocdn`); Leaflet marker images (`unpkg`); uploaded media — direct S3 in prod, `AWS_CLOUDFRONT_MEDIA_URL` is **not** set (`backend/serverless.yml`); `blob:`/`data:` for in-browser image preview. |
| `connect-src` | `'self' https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com https://csd-media.s3.eu-central-1.amazonaws.com` | REST API (`environment.prod.ts`); presigned PUT/POST uploads go browser → S3 directly (`upload.service.ts`). |
| `frame-src` | `'self' https://www.youtube.com` | Lazy YouTube `/embed` iframes (`home.ts`, `blog-post.ts`). |
| `font-src` | `'self' data:` | No web-font CDN in use. |
| `frame-ancestors` | `'self'` | Clickjacking protection (modern replacement for X-Frame-Options). Does not affect us embedding YouTube. |
| `base-uri` / `object-src` / `form-action` | `'self'` / `'none'` / `'self'` | Standard hardening. |
| `upgrade-insecure-requests` | — | All subresources are already HTTPS; this is a backstop. |

> If during Report-Only you see a violation for a media host other than `csd-media.s3.eu-central-1.amazonaws.com` (e.g. older posts), add that host to `img-src`. If `AWS_CLOUDFRONT_MEDIA_URL` is ever set on the backend, swap the S3 host for that CDN domain in both `img-src` and `connect-src`.

### Create the policy

**Console:** CloudFront → Policies → **Response headers** → Create → fill from the JSON (HSTS `max-age=63072000`, includeSubDomains on, preload off; nosniff; X-Frame-Options SAMEORIGIN; Referrer-Policy `strict-origin-when-cross-origin`; X-XSS-Protection `0`; custom header `Content-Security-Policy-Report-Only` = the CSP string).

**CLI (preferred — reuses the committed JSON):**

```bash
aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json
# note the returned .ResponseHeadersPolicy.Id
```

### Attach to the distribution

Console → Distributions → **E3U465AMSVR9PN** → **Behaviors** → for **every** behavior (default + any S3/static behavior) → Edit → **Response headers policy** → `csd-frontend-security-headers` → Save.

No invalidation needed — a response-headers policy is applied at the edge on every response, including cached objects.

### Verify (Report-Only)

```bash
curl -sI https://www.csd-fund.org | grep -iE 'strict-transport|content-type-options|frame-options|referrer-policy|content-security'
```

Then in a browser (DevTools → Console), exercise every CSP-relevant path and confirm **no** `[Report Only]` violations:

- Home page **map** (Carto tiles, Leaflet markers)
- **Blog** post images (S3 media) + **YouTube** embed (thumbnail + iframe)
- **Admin** login → **image upload** (presigned S3 PUT/POST, blob preview)
- Language switch UA/EN

### Switch to enforce

When the console stays clean (give it a few days of real traffic), change the custom header name in the JSON from `Content-Security-Policy-Report-Only` to **`Content-Security-Policy`**, then:

```bash
# get current policy id + etag, then:
aws cloudfront update-response-headers-policy \
  --id <POLICY_ID> --if-match <ETAG> \
  --response-headers-policy-config file://infra/cloudfront-response-headers-policy.json
```

(No re-attach needed — behaviors already point at the policy id.)

---

## Out of scope for Batch 1 (candidates for later)

- **Nonce-based CSP** (drop `script-src 'unsafe-inline'`): requires moving CSP generation into the SSR Lambda (`ui/src/server.ts` + Angular `CSP_NONCE`) so each response gets a fresh nonce. A static CloudFront policy cannot do this.
- **`Permissions-Policy`**: deferred — a restrictive value must still delegate `fullscreen`/`encrypted-media`/`autoplay` to `https://www.youtube.com` or it breaks the embeds. Worth adding with that caveat.
- **HSTS `preload`**: only after confirming every `csd-fund.org` subdomain is HTTPS, then submit to hstspreload.org.
- **`report-to`/`report-uri`**: add a collector endpoint if you want CSP reports server-side instead of console-only.
