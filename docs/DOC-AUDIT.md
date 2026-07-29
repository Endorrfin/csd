# Documentation Audit — 2026-07-28 (revised 2026-07-29)

Ground truth for the documentation refresh. Every fact below was read from source at commit `d93b258` and spot-verified; nothing here is copied from an existing document.

> **Revision 2026-07-29.** Three findings changed after live AWS output and repository archaeology. Two of them were **inverted** — see §0. Read §0 before anything else.

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

---

## 1. Verified inventory

### 1.1 Scale

| Metric | Value | How to re-verify |
| --- | --- | --- |
| Backend modules | 15 | `ls backend/src/modules` |
| Controllers | 16 (incl. `app.controller.ts`) | `find backend/src -name '*.controller.ts'` |
| Route decorators | 118 | `grep -rho "@\(Get\|Post\|Patch\|Put\|Delete\)(" backend/src --include=*.controller.ts \| wc -l` |
| Entity files / `@Entity` classes | 29 / 29 | `find backend/src -name '*.entity.ts' \| wc -l` |
| Migrations | 13 on `main`, **14** on `feat/test-infrastructure` (`+1776000000000-InitialSchema`) | `ls backend/src/database/migrations` |
| Backend jest suites / tests | 17 / 176 | `cd backend && npx jest` |
| UI feature folders | 14 public + 12 admin | `ls ui/src/app/features` |
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
| `SanitizeHtmlPipe` is used by **only** `vacancy.controller.ts` and `procurement.controller.ts`. Blog, `/pages` and About sections accept Quill HTML with no server-side sanitization | README 26, ARCHITECTURE 1046/1050 claim "defense in depth" |
| `backend/serverless.yml` grants `s3:PutObject` **and `s3:GetObject`** on the private bucket, not only `PutObject` on `csd-media/*` | ARCHITECTURE 779/834, backend/CLAUDE 146 |
| `AWS_CLOUDFRONT_MEDIA_URL` is read in code but **never set** in `serverless.yml` → prod public media URLs are direct S3, not CloudFront | README 52/54, ARCHITECTURE 749 |
| Language is hardcoded to `'ua'` on every bootstrap (`app.ts`) and **never persisted** — no localStorage, cookie or URL segment | README 37, ARCHITECTURE 645, ui/CLAUDE 12 |
| CSP is live as **Report-Only**. `SECURITY-HEADERS.md:41-53` matches the live header; the **repo JSON is the unapplied one** — see §0.1 | ARCHITECTURE 1145/1329 (contradict each other) |

### 1.4 Facts absent from every document

- **No PR-check CI on `main`.** `.github/workflows/deploy.yml` is the only workflow there. It triggers on `pull_request: types:[closed]` + `merged==true`, i.e. **after** merge. Neither job runs lint, typecheck or tests, so `npm run verify` is an honour-system local gate. ⚠️ **`feat/test-infrastructure` adds `test.yml` (PR Checks, pre-merge) — see §0.3.** State whichever is true at the time of writing.
- **Migrations run before build and deploy.** A failed build leaves prod already migrated.
- **UI has 2 spec files** for 107 source files. No `vitest.config.ts` exists; `angular.json`'s `test` target has no options block.
- **`ui` `format:check` checks SCSS only** (`prettier --check "src/**/*.scss"`), while `format` writes ts+html+scss. So `verify` never catches TS/HTML formatting drift.
- **`backend/test/jest-e2e.json` is gitignored, not absent** (`backend/.gitignore:38`, since the first commit). It exists in any `nest new` working copy but never in a `git clone`, so `npm run test:e2e` works locally for whoever scaffolded the project and fails for everyone else. Fixed on `feat/test-infrastructure` by a `!test/jest-e2e.json` negation — see §0.3.
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

### 2.3 `docs/MEDIA-UPLOADS.md` (129 lines, last touched 2026-05-22)

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

### 2.4 `CLAUDE.md` (110 lines, last touched 2026-07-03)

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 9–17 | repo tree | omits `infra/`, `CONTRIBUTING.md`, `README.md`, `docs/tasks/` | MISSING |
| 40–48 | pre-commit = `lint && test` | canonical gate is `npm run verify`; backend `lint` runs `--fix` (mutates) | STALE |
| 53–57 | CI pipeline described | omits that no job runs lint/typecheck/tests, and no PR workflow exists | MISSING |
| 59–65 | prod resources | `csd-media-private` absent | MISSING |
| 94–98 | drift warning: README says `/complaint`, `/needs`, `/content`; About unmentioned | **all four already fixed** in README (lines 67, 74, 75, 78). The warning describes a state that no longer exists | WRONG |
| whole | — | never mentions Recovery, Winterization, About registry, `inquiry`, Turnstile, helmet, private bucket | MISSING |

### 2.5 `backend/CLAUDE.md` (155 lines, last touched 2026-07-03)

The most stale document in the repo. It will actively mislead an agent.

| Lines | Says | Reality | Sev |
| --- | --- | --- | --- |
| 17 | e2e via `test/jest-e2e.json` | that file does not exist; `test:e2e` cannot run | WRONG |
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

### 2.6 `ui/CLAUDE.md` (148 lines, last touched 2026-05-17)

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
| 288–292 | `test:e2e` "spins up a real NestJS instance" | config file missing; command fails | WRONG |
| 296–301 | lint/format; "pre-commit enforcement in the repo root (if configured)" | nothing configured — no husky, no lint-staged | STALE |

### 2.8 `ui/README.md` (59 lines, last touched 2026-03-11)

Untouched Angular CLI 21.2.1 boilerplate. Contains no project-specific claim, therefore nothing to correct — **rewrite from scratch**, modelled on `backend/README.md`.

### 2.9 `CONTRIBUTING.md` (548 lines, last touched 2026-07-26)

The most recently updated document, and still carries four outright fabrications.

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

### 2.10 `infra/SECURITY-HEADERS.md` (108 lines)

**Revised.** This document is *accurate about the live state* — its allowlist table matches the header served by production. The drift is in the repository JSON, which contains an unapplied update. See §0.1.

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

`backend/README.md:20-21`, `docs/ARCHITECTURE.md:130,863` and `backend/.env.example:2` are already correct. **Only the root `README.md` is wrong**, in seven places: lines 24, 45, 195, 196, 199, 387, 572 — all say `postgresql@16`/`PostgreSQL 16` for local dev. Fix those seven; touch nothing else.

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

### 3.6 Test infrastructure — **merge `feat/test-infrastructure` first**

New in rev. 2, see §0.3. The branch has been rebased onto `main` (`8f32e52`) and adds the PR-check workflow, Testcontainers e2e, the `InitialSchema` baseline migration and the `!test/jest-e2e.json` gitignore negation.

Two of the audit's sharpest findings — "no PR-check CI" and "`test:e2e` cannot run on a clone" — are true of `main` and **false** after this merge. Merge before the documentation refresh, then document the merged reality. Otherwise the new documents are stale on the day they land.

---

## 4. Suggested rewrite order

Sequenced so that later documents can cite earlier ones instead of duplicating them.

| Pass | Documents | Why this order |
| --- | --- | --- |
| A | `docs/ARCHITECTURE.md` | Largest, and the natural home for the three new feature sections and the ER diagram. Everything else can link to it. |
| B | `README.md`, `backend/README.md`, `ui/README.md` | Entry points. `ui/README.md` is a from-scratch write. |
| C | `docs/MEDIA-UPLOADS.md`, `infra/SECURITY-HEADERS.md` | Narrow, factual, mostly mechanical once the bucket/endpoint matrix from pass A exists. |
| D | `CLAUDE.md` ×3, `CONTRIBUTING.md` | Agent- and contributor-facing. Should be written last so they can point at the corrected documents rather than restating them. |

Passes C and D can run in parallel once A is done.

---

## 5. Re-verification

Before quoting any figure from this file, re-run the command in §1.1 — this audit is a snapshot of `d93b258`, not a live view. If a document and this audit disagree, check the code; if the code and this audit disagree, the code wins and this file should be corrected.
