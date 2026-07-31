# CSD Fund — Web Portal

Web platform for the Charitable Fund **"Centre for Support and Development"** — WASH recovery, reconstruction, and shelter support in Ukraine.

**Live:** https://www.csd-fund.org

The repository is a monorepo with two deployable apps:

```
csd-fund/
├── backend/   # NestJS 11 REST API → AWS Lambda + API Gateway + RDS
├── ui/        # Angular 21 SSR app → AWS Lambda + S3 + CloudFront
├── convertors/  # Python CSV/XLSX → JSON converters (feed ui/src/assets/data/, run manually)
├── docs/      # Architecture & operations guide, media uploads, doc audit
├── infra/     # CloudFront security-headers policy + S3 CORS files (applied by hand)
├── CONTRIBUTING.md                 # Canonical command list & PR process
└── .github/workflows/
    ├── test.yml     # PR Checks — pre-merge, BACKEND ONLY
    └── deploy.yml   # Post-merge deploy for both apps
```

> **Deeper reference:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) is the maintained long-form guide (data model, feature catalogue, deployment, runbooks, incidents). This README is the entry point and links there rather than duplicating it.

---

## 1. Technology stack

### Backend (`backend/`)
- **Runtime:** Node.js 22 (LTS)
- **Framework:** NestJS 11 + TypeScript 5.7
- **ORM / DB:** TypeORM 0.3 + PostgreSQL — **local dev 14** (Homebrew `postgresql@14`), **production 16.13** (AWS RDS, SSL in prod)
- **Auth:** Passport (`passport-local`, `passport-jwt`) + `@nestjs/jwt`, role-based guards (`public` / `donor` / `manager` / `admin` / `super_admin`)
- **Anti-spam:** Cloudflare Turnstile via a custom `TurnstileGuard` on exactly three anonymous routes (`POST /needs-forms/recovery`, `POST /needs-forms/winterization`, `POST /upload/needs-presigned`). The token travels in the **`x-turnstile-token` header**, not the body — the global `ValidationPipe` sets `forbidNonWhitelisted`, so an extra body field would be rejected
- **Validation & sanitization:** `class-validator`, `class-transformer`, global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. `sanitize-html` via `SanitizeHtmlPipe` is applied to **five routes only** — procurement create/update and vacancy create/update/publish. About sections are sanitized by a *separate* config inside `about.service.ts`; blog posts and `/api/pages` are **not** sanitized server-side. See [`docs/ARCHITECTURE.md` §14.2](./docs/ARCHITECTURE.md#142-known-unresolved-issues)
- **File storage:** AWS S3 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. **Two media buckets** (`csd-media` public, `csd-media-private` for PII) and **four upload endpoints**, three of them presigned **POST** — see §2.2 below and [`docs/ARCHITECTURE.md` §8.1](./docs/ARCHITECTURE.md#81-media-buckets--upload-matrix)
- **Reports:** `exceljs` — 6-sheet XLSX for WASH, 3-sheet XLSX for Recovery and for Winterization; manual CSV with UTF-8 BOM for complaints and inquiries
- **Lambda adapter:** `@codegenie/serverless-express` (cached bootstrap across warm invocations)
- **API prefix:** `/api` (set globally in `lambda.ts` and `main.ts`)
- **Tests / lint:** Jest 30 (unit + Testcontainers e2e), ESLint 9 + Prettier

### Frontend (`ui/`)
- **Framework:** Angular **21** standalone components + signals + Angular SSR (`@angular/ssr`, `provideClientHydration` with `withEventReplay`)
- **Routing:** lazy-loaded `loadComponent` / `loadChildren` per feature, route-level guards (`managerGuard`, `adminGuard`, `superAdminGuard`)
- **State / HTTP:** RxJS + signals; central `ApiService` prepends `/api`; `authInterceptor` attaches JWT
- **i18n:** `@ngx-translate/core` + `http-loader`, fallback `ua`, files in `src/assets/i18n/{ua,en}.json`
- **Maps:** Leaflet + `leaflet.markercluster` (activity map page)
- **Rich text:** Quill 2 via `ngx-quill`, sanitized server-side
- **Icons:** `lucide-angular`
- **Build / lint:** `@angular/build`, `angular-eslint`, Prettier; unit tests via Vitest 4
- **SSR Lambda adapter:** `serverless-http` wrapping the SSR Express app (`ui/lambda.mjs`)

### Database

| Environment | Version | Notes |
| --- | --- | --- |
| Local dev | **PostgreSQL 14** | Homebrew `postgresql@14` on port 5432 (the `.env.example` default), or Docker `postgres:16` mapped to host 5433 |
| Backend e2e | `postgres:16-alpine` | started by Testcontainers in `backend/test/setup-pg.ts`; needs Docker |
| Production | **PostgreSQL 16.13** † | RDS `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com` † |

† Not derivable from this repository — `DB_HOST` comes from a GitHub Secret and the engine version lives in RDS. Both were read from live AWS on **2026-07-29**; re-check with `aws rds describe-db-instances --db-instance-identifier csd-postgres` before relying on them.

> ⚠ The dev/prod major-version skew (14 → 16) is real: migrations are *authored* against PostgreSQL 14 on developer machines. They are then replayed in full against `postgres:16-alpine` by the e2e suite, so the gap is covered by CI — but only for whatever the e2e suite exercises. Usually benign, occasionally not — see [`docs/ARCHITECTURE.md` §13](./docs/ARCHITECTURE.md#13-database-migrations).

- TypeORM CLI migrations only (`synchronize: false`); **14 migrations** in `backend/src/database/migrations/`, starting from the `1776000000000-InitialSchema` baseline
- Seeding is **local only**. `run-seeds.ts` is called from `main.ts` after `app.listen()` and runs `seedEquipmentCatalog()` (21 categories / 232 items) then `seedAboutDocuments()` (32 register entries). `lambda.ts` never seeds, so **seeds never run in production** — the About registry reaches prod only via `npm run seed:about-documents`. There is no super-admin seed in the bootstrap chain and **no locations seed at all** (locations are a static frontend asset)

### Infrastructure & deployment
- **Cloud:** AWS, region `eu-central-1`
- **Backend:** Serverless Framework v4 → AWS Lambda (`csd-api-prod-api`) + API Gateway, env injected from GitHub Secrets
- **Frontend:** static build (hashed assets) → S3 (`csd-fund-static`) with long cache; SSR → AWS Lambda (`csd-ssr-prod-ssr`) + API Gateway; CloudFront distribution `E3U465AMSVR9PN` in front of both with `/*` invalidation on each deploy
- **DB:** AWS RDS PostgreSQL 16.13
- **Media:** two S3 buckets — `csd-media` (public: blog covers, testimonial photos) and `csd-media-private` (recovery/winterization evidence, About registry PDFs; **no public-read policy**, presigned GET only). `AWS_CLOUDFRONT_MEDIA_URL` is read in code but never set in `serverless.yml`, so **public media URLs in production are direct S3, not CloudFront**
- **Security headers:** a CloudFront response-headers policy (`csd-frontend-security-headers`, id `0dfcb167-3b72-4c89-8574-0465ee42283c`) is attached to all 10 cache behaviours of `E3U465AMSVR9PN`, and the CSP is served **Report-Only** — it reports and blocks nothing. The policy is applied to AWS **by hand**, so neither the id nor the attachment is derivable from this repo; both were read from live CloudFront on 2026-07-29. `infra/cloudfront-response-headers-policy.json` is the committed source and currently contains an update that has **not** been applied. See [`docs/ARCHITECTURE.md` §14.3](./docs/ARCHITECTURE.md#143-accepted-trade-offs) — the single source of truth on CSP status
- **CI/CD:** two GitHub Actions workflows — see §1.1

#### 1.1 What CI does and does not do

| Workflow | When | Covers |
| --- | --- | --- |
| `test.yml` — "PR Checks" | `pull_request` → `main` | **One job, `backend`:** `npm ci` → `lint:check` → `check:cjs` → `npm test` → `docker pull postgres:16-alpine` → `test:e2e` |
| `deploy.yml` | PR **merge** to `main`, or `workflow_dispatch` | Backend job: `npm ci` → `check:cjs` → `migration:show` → conditional `migration:run` → `nest build` → `serverless deploy --stage prod` → smoke test `GET /api/health`. Frontend job (`needs:` backend success): `npm ci` → `ng build` → `aws s3 sync` (hashed assets 1y immutable, HTML no-cache) → SSR Lambda deploy → CloudFront `/*` invalidation → smoke test grepping **`ng-server-context`** |

**What no workflow does — assume nothing:**

- **The entire `ui` app is ungated pre-merge.** No `ng lint`, no `typecheck`, no `ng test`, no `format:check`, no `ng build` runs on any PR. The frontend's first CI execution is the production build in `deploy.yml`, *after* merge.
- Backend `typecheck` and `build` are not run pre-merge either. `npm run verify` chains them in both apps, but **no workflow ever invokes it**.
- `deploy.yml` runs no lint, typecheck or tests in either job — it is a delivery pipeline, not a quality gate.
- ⚠ **Migrations run before build and deploy.** A failed build leaves production already migrated against the previous code.

---

## 2. Backend modules (`backend/src/modules/`)

**15 modules**, each a NestJS feature module wired in `app.module.ts`, across 16 controllers and 118 route decorators. All admin endpoints are protected by `JwtAuthGuard` + `RolesGuard`; `super_admin` bypasses role checks. Endpoints below are relative to the module's mount point — every route is also prefixed globally with `/api`. Where the folder name differs from the mount, the actual mount is shown in parentheses.

> ⚠ `RolesGuard` returns `true` when `@Roles()` is absent or empty, so `@UseGuards(RolesGuard)` **without** the decorator is a silent no-op. Always pair them.

| Module | Public endpoints | Admin endpoints | Notable functionality |
| --- | --- | --- | --- |
| **auth** | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password` | `GET /profile` | Local + JWT Passport strategies; password-reset token flow with expiry |
| **users** | — | `GET /users`, `PATCH /users/:id/role` (super_admin only, blocks self-demotion) | Role management |
| **content** (`/pages`) | `GET /pages`, `GET /pages/:slug` | full CRUD by slug | Static bilingual pages (UA/EN) with `isPublished` flag and `sortOrder` |
| **blog** | `GET /blog`, `GET /blog/featured`, `GET /blog/:slug` (paginated) | full CRUD | Bilingual posts, slug routing, cover image + image gallery + video, `isFeatured` |
| **partners** | `GET /partners` (active only) | full CRUD | Donor / Partner / Government typing, soft-delete via `isActive` |
| **cooperation** | `GET /cooperation?type=…` | full CRUD | Generic container for VACANCY / TENDER / INITIATIVE entries |
| **procurement** | `GET /procurement` (**non-draft**, so cancelled and completed tenders stay visible) | `/admin/list`, CRUD, `PATCH /:id/status`, `PATCH /:id/publish`, delete (drafts only) | **7-step** tender form (`totalSteps = 7`: Info · Method · Technical · Timeline · Evaluation · Documents · Review), Quill HTML sanitized server-side, 8 live status states + a deprecated `closed` kept for pg-enum compatibility |
| **vacancy** (`/vacancies`) | `GET /vacancies` (non-draft), `GET /vacancies/:id` | `GET /vacancies/admin/list`, CRUD, `PATCH /vacancies/:id/publish`, `PATCH /vacancies/:id/status`, delete (drafts only) | Bilingual job posts, employment type, sanitized HTML, 7 live status states + a deprecated `closed` |
| **testimonial** (`/testimonials`) | `GET /testimonials` (approved only), `GET /testimonials/:id`, **`POST /testimonials` (anonymous)** | `GET /testimonials/admin/list`, update, `PATCH /testimonials/:id/approve`, `/reject`, `/status`, `/verify`, `DELETE /testimonials/:id` | Two-tier moderation: `status` (approval) + independent `isVerified` flag. ⚠ **Delete has no status precondition** — unlike procurement/vacancy/complaint, any testimonial can be hard-deleted |
| **complaint** (`/complaints`) | `POST /complaints` (anonymous) | `GET /complaints` (legacy unfiltered), `GET /complaints/admin/list`, `GET /complaints/admin/export` (CSV + UTF-8 BOM), `GET /complaints/:id`, `PATCH /complaints/:id`, `PATCH /complaints/:id/status`, delete (closed only) | Anonymous submission with attachments, location, expected resolution. All admin routes are **manager+** (`MANAGER, ADMIN, SUPER_ADMIN`); it is the *frontend* route that is admin-only, via `adminGuard` |
| **inquiry** (`/inquiries`) | `POST /inquiries` (anonymous — the public contact form) | `GET /inquiries/admin/list`, `GET /inquiries/admin/export` (CSV + UTF-8 BOM), `GET /inquiries/:id`, `PATCH /inquiries/:id/status`, `DELETE /inquiries/:id` — all `admin` + `super_admin` | General contact-form submissions with a status workflow. Admin UI at `/admin/inquiries` behind `adminGuard` |
| **needs** (`/needs-forms`) | `POST /needs-forms/wash` (anonymous), `POST /needs-forms/recovery` and `POST /needs-forms/winterization` (anonymous, **`TurnstileGuard`**) | For each of `wash` / `recovery` / `winterization`: `GET`, `GET /export-xlsx`, `GET /:id`, `GET /:id/audit-log`, `PATCH /:id`, `PATCH /:id/full`, `PATCH /bulk`, `DELETE /:id` — 27 routes total | **Three form families.** WASH: 5 child relations (boreholes, towers, purification, pumps, equipment) + 6-sheet XLSX. Recovery & Winterization: 3-sheet XLSX each, private-bucket attachments, shared `needs_form_audit_log` and tracking-number sequences. Details: [ARCHITECTURE §7.3](./docs/ARCHITECTURE.md#73-wash-needs-assessment), [§7.7](./docs/ARCHITECTURE.md#77-recovery-form), [§7.8](./docs/ARCHITECTURE.md#78-winterization-form), [§7.10](./docs/ARCHITECTURE.md#710-shared-needs-infrastructure) |
| **equipment-catalog** | `GET /equipment-catalog` | — (seed-driven) | 21 categories / 232 items used by the WASH form dropdowns |
| **upload** | `POST /upload/testimonial-presigned` (anonymous), `POST /upload/needs-presigned` (**`TurnstileGuard`**) | `POST /upload/presigned-url` (manager+), `POST /upload/about-doc-presigned` (admin+) | **Four endpoints, two buckets** — see §2.2 |
| **about** | `GET /about` (published **sections only**), `GET /about/documents` (registry listing, no URLs), `GET /about/documents/:code/file?locale=` (one presigned GET, TTL 300 s) | `GET/POST/PATCH/DELETE /about/admin/sections[/:id]` and `/about/admin/documents[/:id]`, plus `/about/admin/documents/:id/files` and `/about/admin/files/:fileId[/url]` (admin + super_admin only) | Bilingual "About" page sections **and** a separate versioned document registry. `GET /about` no longer returns document links — that bulk-download vector was closed deliberately. See [ARCHITECTURE §7.9](./docs/ARCHITECTURE.md#79-about-document-registry) |

**Cross-cutting:**
- `src/common/assert-required-env.ts` — pre-bootstrap env check; the app refuses to start on a short/missing `JWT_SECRET`, or on a missing `FRONTEND_URL` in production
- `src/common/security-headers.ts` — helmet, registered before CORS and routing in both entry points
- `src/common/frontend-urls.ts` — shared `getFrontendOrigins()`; the CORS allowlist source for **both** `main.ts` and `lambda.ts`
- `src/common/guards/turnstile.guard.ts` — Cloudflare Turnstile verification. Unset `TURNSTILE_SECRET_KEY` locally ⇒ warns and passes; unset in production ⇒ the three guarded routes fail closed with 403
- `src/common/pipes/sanitize-html.pipe.ts` — HTML sanitization, applied to procurement and vacancy controllers only
- `src/database/data-source.ts` — standalone DataSource for the TypeORM CLI
- `src/database/run-seeds.ts` — called from `main.ts` after `app.listen()`. Runs `seedEquipmentCatalog()` (21 categories / 232 items) **and** `seedAboutDocuments()` (32 entries). Local only — `lambda.ts` never calls it. Super-admin is a separate manual script (`seed-super-admin.ts` via `npm run seed:super-admin`); locations are not seeded at all — they live as a static frontend asset in `ui/src/assets/data/locations.json`
- `src/database/run-seeds-standalone.ts` — **dead code**: no npm script and no import references it
- `backend/lambda.ts` (at the backend root, **not** in `src/`) — Lambda handler with cached Nest bootstrap, base64 binary settings for XLSX/octet-stream. Compiled into `dist/lambda.js`; `serverless.yml` references it as `dist/lambda.handler`

### 2.1 Recently shipped features

Three features shipped after the previous documentation pass. Each is fully written up in `docs/ARCHITECTURE.md`; the summaries here exist so you know they are there.

**Recovery form** — reconstruction requests for war-damaged objects. Public 6-step form at `/needs/recovery-form`, `POST /api/needs-forms/recovery`, Turnstile-guarded. Tracking numbers `CSD-R-<year>-<0000>`. **3–10 photos are mandatory** and `estimatedCost` is `NOT NULL`, so a community without a кошторис cannot submit. Attachments land in `csd-media-private`. 3-sheet XLSX export. → [ARCHITECTURE §7.7](./docs/ARCHITECTURE.md#77-recovery-form)

**Winterization form** — winter-season needs (heating, insulation, commodities). Public 7-step form at `/needs/winterization-form`, `POST /api/needs-forms/winterization`, Turnstile-guarded. Tracking numbers `CSD-W-<year>-<0000>`. Deliberately unlike Recovery in three ways: `estimatedCost` is nullable, photos are required only for works categories, and `applicantType='household'` returns **422** unless `WINTERIZATION_HOUSEHOLD_ENABLED` is exactly `'true'` (a management decision, not a config tweak). → [ARCHITECTURE §7.8](./docs/ARCHITECTURE.md#78-winterization-form)

**About document registry** — the fund's governance documents as a browsable register at `/about/documents`, backed by versioned PDFs in the private bucket and seeded with 32 entries. `GET /api/about` returns sections only; the registry listing carries **no URLs**, and each file is fetched as its own 300-second presigned GET keyed by `code`. Three access modes (`public_download` / `view_only` / `on_request`; the last returns 403 today). ⚠ **Mid-flight** — the in-app PDF viewer (PR-D4) is not built, so `view_only` currently relies on `Content-Disposition: inline`. → [ARCHITECTURE §7.9](./docs/ARCHITECTURE.md#79-about-document-registry)

### 2.2 Uploads — buckets and endpoints

Three buckets, and it matters which is which:

| Bucket | Holds | Public read |
| --- | --- | --- |
| `csd-fund-static` | Angular browser bundle and hashed assets | yes, via CloudFront |
| `csd-media` | Blog cover images, testimonial photos | yes |
| `csd-media-private` | Recovery/winterization photos & documents, About registry PDFs | **no** — presigned GET only |

Four upload endpoints. **Three of the four are presigned POST, not PUT** — a recurring source of doc drift:

| Endpoint | Auth | S3 op | Bucket | Size cap |
| --- | --- | --- | --- | --- |
| `POST /api/upload/presigned-url` | Jwt + Roles(MANAGER, ADMIN) | presigned **PUT** | `csd-media` | ⚠ **none** — a presigned PUT cannot carry a content-length condition |
| `POST /api/upload/testimonial-presigned` | **none** (anonymous) | presigned POST | `csd-media` | 5 MB |
| `POST /api/upload/needs-presigned` | **`TurnstileGuard`** (no JWT) | presigned POST | `csd-media-private` | 5 MB photo · 15 MB doc |
| `POST /api/upload/about-doc-presigned` | Jwt + Roles(ADMIN, SUPER_ADMIN) | presigned POST | `csd-media-private` | 4 MB, PDF only |

All presigned URLs expire in 300 s. Key prefixes, MIME allow-lists and the two presigned-**GET** read paths are in [ARCHITECTURE §8.1](./docs/ARCHITECTURE.md#81-media-buckets--upload-matrix); operational detail is in [`docs/MEDIA-UPLOADS.md`](./docs/MEDIA-UPLOADS.md).

Two things worth knowing before you touch this area:

- The backend IAM role has `s3:PutObject` on `csd-media/*` and `s3:PutObject` + `s3:GetObject` on `csd-media-private/*` — **and nothing else**. There is no `s3:DeleteObject`, which is why deleting a needs form leaves its S3 objects behind.
- S3 CORS is applied **by hand**, not by Serverless: `infra/s3-csd-media-cors.json` and `infra/s3-csd-media-private-cors.json`. Re-apply after any bucket recreation.

### 2.3 Environment variables

`backend/.env.example` is the template — copy it to `.env` and fill it in. It ships `DB_*`, `JWT_SECRET`, `FRONTEND_URL`, `AWS_S3_PRIVATE_BUCKET`, `TURNSTILE_SECRET_KEY` and `WINTERIZATION_HOUSEHOLD_ENABLED`, each with a comment explaining the failure mode.

Two that are easy to misread:

- **`FRONTEND_URL` is a comma-separated allowlist**, not a single URL. The first entry is canonical and is what password-reset links are built from. In production the app **refuses to boot** without it — there is no `'*'` fallback.
- **`WINTERIZATION_HOUSEHOLD_ENABLED` is a strict string compare against `'true'`.** `1`, `TRUE` and `yes` all leave the gate closed.

**Five variables are read in code but are *not* in `.env.example`:**

| Var | Read at | Consequence if unset |
| --- | --- | --- |
| `NODE_ENV` | RDS SSL, Turnstile fail-closed, prod `FRONTEND_URL` assertion | dev-mode behaviour everywhere |
| `PORT` | `main.ts` | defaults to 3000 |
| `AWS_REGION` | `upload.service.ts` | code default `eu-central-1`; injected by the Lambda runtime in prod |
| `AWS_S3_MEDIA_BUCKET` | `upload.service.ts` | ⚠ **locally defaults to `''`** — public-media presigned URLs are built against an empty bucket name **with no error** |
| `AWS_CLOUDFRONT_MEDIA_URL` | `upload.service.ts` | falls back to direct S3 URLs. Never set in `serverless.yml` either, so this is production behaviour too |

Full reference, including what Serverless injects in production and what deliberately is *not* in env: [ARCHITECTURE §9](./docs/ARCHITECTURE.md#9-environment-variables-reference).

---

## 3. Frontend features (`ui/src/app/features/`)

Routes are defined in `app.routes.ts` (public) and `features/admin/admin.routes.ts` (staff).

### 3.1 Public site
- **Home** (`/`) — hero, featured content, impact stats (signal-driven service)
- **About** (`/about`) — a shell with two children: the sections page (`/about`) and the **document registry** (`/about/documents`)
- **Blog** (`/blog`, `/blog/:slug`) — paginated list + post detail with route resolver
- **Partners** (`/partners`) — ⚠ FROZEN: route and header link are commented out until the fund provides partner logos & data. `PartnersComponent` and backend `GET /api/partners` are ready; to re-enable, uncomment the block in `ui/src/app/app.routes.ts` (search "FROZEN") and the matching nav link in `ui/src/app/layout/header/header.ts`.
- **Activity map** (`/activity-map`) — Leaflet map with marker clustering, category sidebar, signal-based filtering, data from `assets/data/activities.json`
- **Cooperation** (`/cooperation/...`) with four child feature areas:
    - `procurement` — list / detail / submit form (multi-step)
    - `vacancy` — list / detail / submit form
    - `testimonial` — list / submit form
    - `complaint` — anonymous complaint form
- **Needs** (`/needs`, tabbed) — three live forms plus one "coming soon" placeholder:
    - `/needs/wash-form` — WASH needs assessment with dynamic child sections (borehole, tower, purification, pump, equipment items pulled from the catalogue)
    - `/needs/recovery-form` — Recovery, 6 steps, Turnstile, mandatory photos
    - `/needs/winterization-form` — Winterization, 7 steps, Turnstile
- **Contact** (`/contact`) — submits to `POST /api/inquiries`
- **Auth** — `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Not found** (`**`)

### 3.2 Admin panel (`/admin`, lazy-loaded, `managerGuard`)
- **WASH forms** — list + detail, audit log, status workflow, bulk update, 6-sheet XLSX export
- **Recovery forms** — list + detail, audit log, full edit, 3-sheet XLSX export
- **Winterization forms** — list + detail, audit log, full edit, 3-sheet XLSX export
- **Procurements** — list / moderation
- **Vacancies** — list / moderation
- **Testimonials** — moderation (approve / reject + verify toggle) and edit
- **Complaints** — list with drawer (admin+ only via `adminGuard`)
- **Inquiries** — contact-form submissions with CSV export (admin+ only via `adminGuard`)
- **About** — section CRUD and document-registry management
- **Users management** — role administration (super-admin only via `superAdminGuard`)

13 admin feature folders in total. **All three** needs forms use one Angular component each for both the public submit and the admin full-edit, switched by `@Input() mode: 'create' | 'edit'` — see [ARCHITECTURE §7.10](./docs/ARCHITECTURE.md#710-shared-needs-infrastructure).

### 3.3 Shared / core
- `core/services/api.service.ts` — central HTTP client prepending `/api`
- `core/services/auth.service.ts` — JWT storage + role helpers (`isManager`, `isAdmin`, `isSuperAdmin`)
- `core/services/language.service.ts` — **signal-based** current language; mandatory for language-dependent logic because the app is zoneless and `translate.currentLang` is not reactive
- `core/services/page-title.service.ts` — per-route document title
- `core/interceptors/auth.interceptor.ts` — attaches `Authorization: Bearer …`
- `shared/components/` — `carousel`, `file-upload`, `form-stepper`, `location-selector`, `sticky-cta`, `turnstile`
- `shared/services/location.service.ts` + `assets/data/locations.json` — Ukraine oblast / hromada selector
- `shared/pipes/quill-html.pipe.ts` + `shared/config/quill.config.ts` — safe rendering of Quill HTML
- `shared/directives/fade-in-on-scroll.directive.ts` — reveal animation
- `assets/i18n/{ua,en}.json` — full UI translations

Frontend detail — render modes, npm scripts, testing reality, the `environment` keys and the known debt — lives in [`ui/README.md`](./ui/README.md).

---

## 4. Local development setup

> **For interns and junior developers.** This section walks you through everything you need — from a brand-new laptop to a fully running local environment with both the backend API and the Angular frontend.

### What you will run locally

| Process | URL | Folder | Start command |
| --- | --- | --- | --- |
| Backend API (NestJS) | `http://localhost:3000` | `backend/` | `npm run start:dev` |
| Frontend (Angular) | `http://localhost:4200` | `ui/` | `npm start` |
| PostgreSQL database | `localhost:5432` (macOS) / `localhost:5433` (Windows Docker) | — | managed by OS / Docker |

Both processes must be running at the same time. The Angular dev server is pre-configured to call the backend at `http://localhost:3000` via `src/environments/environment.ts`.

---

### 4.1 macOS setup (MacBook)

#### Step 1 — Install Xcode Command Line Tools *(one-time)*

```bash
xcode-select --install
```

A dialog will appear — click **Install**. This provides `git`, `make`, and other compiler tools.

#### Step 2 — Install Homebrew *(one-time)*

[Homebrew](https://brew.sh) is the package manager used to install everything else.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After installation, follow the printed instructions to add Homebrew to your `PATH` (usually adding two lines to `~/.zshrc`). Then reload your shell:

```bash
source ~/.zshrc
brew --version   # should print a version number
```

#### Step 3 — Install Node.js 22 via fnm *(one-time)*

[fnm](https://github.com/Schniz/fnm) is a fast Node version manager. It reads `.nvmrc` files automatically so you always get the right Node version per project.

```bash
brew install fnm

# Add fnm to your shell (append to ~/.zshrc):
echo 'eval "$(fnm env --use-on-cd --shell zsh)"' >> ~/.zshrc
source ~/.zshrc

# Install the required Node version (pinned in .nvmrc at the repo root):
fnm install 22.17.0
fnm use 22.17.0

# Verify:
node --version   # must print v22.17.0
npm --version    # must print 10.x
```

#### Step 4 — Set up PostgreSQL *(one-time)*

Choose **one** option. Option A (Homebrew) is simpler if you prefer native tooling; Option B (Docker) keeps your OS clean.

**Option A — Homebrew (native)** — this is what the team runs locally.

```bash
brew install postgresql@14
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

brew services start postgresql@14

# Verify the server is listening:
pg_isready -h localhost -p 5432   # should print "localhost:5432 - accepting connections"
```

> ⚠ If you already have another PostgreSQL formula installed (`postgresql@15`, `postgresql@16`), make sure it is **not started** — it will contend for port 5432, migrations will apply to one server while the app connects to the other, and you will reproduce Incident #1 exactly. `brew services list` is the quickest check.

**Option B — Docker Desktop**

```bash
brew install --cask docker
# Launch Docker Desktop from /Applications and wait for the whale icon to appear in the menu bar.

docker run -d \
  --name csd-pg \
  --restart unless-stopped \
  -e POSTGRES_USER=csd_user \
  -e POSTGRES_PASSWORD=csd_password \
  -e POSTGRES_DB=csd_db \
  -p 5433:5432 \
  postgres:16

# Verify:
docker exec csd-pg psql -U csd_user -d csd_db -c "SELECT version();"
```

> ⚠ Docker maps container port 5432 to **host port 5433** to avoid conflicts with any local PostgreSQL. Remember this when setting `DB_PORT` in `.env` (Step 7).
>
> Note the version difference: the Homebrew option gives you PostgreSQL **14** (what the team runs and what `.env.example` assumes), the Docker option gives you **16** (what production runs). Both work; pick one and stay on it.

#### Step 5 — Create the database and user *(Homebrew only — skip if you used Docker)*

Docker already created the database and user via the `POSTGRES_*` environment variables in Step 4. If you used Homebrew, run:

```bash
# Connect as the default superuser (your macOS username):
psql postgres -c "CREATE USER csd_user WITH PASSWORD 'csd_password';"
createdb -O csd_user csd_db
psql csd_db -c "GRANT ALL PRIVILEGES ON DATABASE csd_db TO csd_user;"

# Verify you can connect as the app user:
psql -U csd_user -d csd_db -c "SELECT 1 AS ok;"
```

#### Step 6 — Clone the repository

```bash
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/Endorrfin/csd.git csd-fund
cd csd-fund
```

#### Step 7 — Configure and start the backend

```bash
cd backend

# 1. Create your local .env from the template:
cp .env.example .env
```

Open `.env` in your editor and fill in the following values:

```dotenv
DB_HOST=localhost
DB_PORT=5432          # Homebrew → 5432 | Docker → 5433
DB_USERNAME=csd_user
DB_PASSWORD=csd_password
DB_NAME=csd_db

# Generate a strong secret (run this in your terminal and paste the output):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<paste-the-generated-value-here>

FRONTEND_URL=http://localhost:4200
```

The remaining keys in `.env.example` (`AWS_S3_PRIVATE_BUCKET`, `TURNSTILE_SECRET_KEY`, `WINTERIZATION_HOUSEHOLD_ENABLED`) can stay empty/default locally — see §2.3. Leave `TURNSTILE_SECRET_KEY` unset and the Turnstile guard warns and passes, so the Recovery and Winterization forms work in dev.

```bash
# 2. Install dependencies:
npm install

# 3. Apply all database migrations:
npm run migration:run

# 4. Confirm every migration ran successfully (each line should show [X]):
npm run migration:show

# 5. Start the dev server with hot-reload:
npm run start:dev
```

The API is now available at `http://localhost:3000`. Quick smoke test:

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"2026-…"}
```

#### Step 8 — Seed the super-admin account *(first time only)*

The super-admin is the first staff account that lets you access `/admin`. Run this once, then store the credentials in your password manager.

```bash
# The leading space prevents the command from being saved to shell history.
# Replace the values below with your own email and a strong password
# (min 16 chars, mix of upper/lower/digit/symbol):
 SUPER_ADMIN_EMAIL="you@example.com" \
 SUPER_ADMIN_PASSWORD="YourStr0ng!Password" \
 npm run seed:super-admin
```

#### Step 9 — Set up and start the frontend

Open a **second terminal tab** (leave the backend running in the first):

```bash
cd ~/projects/csd-fund/ui

npm install
npm start
```

Angular DevServer starts at `http://localhost:4200`. It proxies API calls to `http://localhost:3000` via `environment.ts`.

#### Step 10 — Verify the full stack

1. Open `http://localhost:4200` in a browser — the homepage should load.
2. Go to `http://localhost:4200/login` and sign in with the super-admin credentials from Step 8.
3. Navigate to `http://localhost:4200/admin` — the admin panel should be visible.
4. Open DevTools → Network tab and confirm API requests go to `localhost:3000/api/…` with HTTP 200.

---

### 4.2 Windows setup

#### Step 1 — Install Git for Windows *(one-time)*

Download and run the installer from <https://git-scm.com/download/win>.

Recommended options during setup:
- **Adjusting your PATH**: *Git from the command line and also from 3rd-party software*
- **Line ending conversions**: *Checkout as-is, commit Unix-style line endings*
- **Terminal emulator**: *Use Windows' default console window* (or MinTTY if you prefer)

After installation, open **PowerShell** (or Git Bash) and configure line endings:

```powershell
git config --global core.autocrlf input
```

#### Step 2 — Enable long paths *(one-time, requires Admin)*

`node_modules` can exceed Windows' default 260-character path limit. Enable long-path support **before** running `npm install`.

```powershell
# Open PowerShell as Administrator, then run:
git config --system core.longpaths true

Set-ItemProperty `
  -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" `
  -Value 1
```

Restart your terminal after this step.

#### Step 3 — Install Node.js 22 via fnm *(one-time)*

```powershell
# Install fnm via winget (Windows Package Manager, built into Windows 10/11):
winget install Schniz.fnm

# Restart PowerShell, then:
fnm install 22.17.0
fnm use 22.17.0

# Verify:
node --version   # must print v22.17.0
npm --version    # must print 10.x
```

> If `winget` is not available, download fnm from <https://github.com/Schniz/fnm/releases> and add it to your `PATH` manually. Alternatively download Node.js 22.17.0 directly from <https://nodejs.org>.

#### Step 4 — Install Docker Desktop and start PostgreSQL *(one-time)*

Docker is the recommended way to run PostgreSQL on Windows — no manual user/DB creation needed.

1. Download **Docker Desktop** from <https://www.docker.com/products/docker-desktop/>.
2. During install, enable the **WSL 2 backend** when prompted (recommended).
3. Launch Docker Desktop and wait until the whale icon in the system tray shows *"Docker Desktop is running"*.

Then start a PostgreSQL 16 container:

```powershell
docker run -d `
  --name csd-pg `
  --restart unless-stopped `
  -e POSTGRES_USER=csd_user `
  -e POSTGRES_PASSWORD=csd_password `
  -e POSTGRES_DB=csd_db `
  -p 5433:5432 `
  postgres:16

# Verify:
docker exec csd-pg psql -U csd_user -d csd_db -c "SELECT version();"
```

> The container is mapped to **host port 5433** (not 5432) so it does not conflict with any other PostgreSQL that may be installed. Set `DB_PORT=5433` in your `.env` in the next step.

#### Step 5 — Clone the repository

```powershell
New-Item -ItemType Directory -Path "$HOME\projects" -Force
cd "$HOME\projects"
git clone https://github.com/Endorrfin/csd.git csd-fund
cd csd-fund
```

#### Step 6 — Configure and start the backend

```powershell
cd backend

# Copy the environment template:
Copy-Item .env.example .env
# Or in Git Bash: cp .env.example .env
```

Open `.env` in VS Code (`code .env`) and set:

```dotenv
DB_HOST=localhost
DB_PORT=5433          # Docker mapping
DB_USERNAME=csd_user
DB_PASSWORD=csd_password
DB_NAME=csd_db

# Generate a strong secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<paste-here>

FRONTEND_URL=http://localhost:4200
```

```powershell
# Install dependencies:
npm install

# Run all pending migrations:
npm run migration:run

# Confirm all migrations ran ([X] next to each):
npm run migration:show

# Start the API with hot-reload:
npm run start:dev
```

Smoke test (open a second PowerShell tab):

```powershell
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"2026-…"}
```

#### Step 7 — Seed the super-admin account *(first time only)*

**PowerShell:**

```powershell
$env:SUPER_ADMIN_EMAIL = "you@example.com"
$env:SUPER_ADMIN_PASSWORD = "YourStr0ng!Password"
npm run seed:super-admin

# Clear sensitive env vars immediately:
Remove-Item Env:SUPER_ADMIN_EMAIL
Remove-Item Env:SUPER_ADMIN_PASSWORD
```

**Git Bash (alternative):**

```bash
 SUPER_ADMIN_EMAIL="you@example.com" \
 SUPER_ADMIN_PASSWORD="YourStr0ng!Password" \
 npm run seed:super-admin
```

#### Step 8 — Set up and start the frontend

Open a **new PowerShell tab** (keep the backend running):

```powershell
cd "$HOME\projects\csd-fund\ui"
npm install
npm start
```

#### Step 9 — Verify the full stack

1. Open `http://localhost:4200` — homepage loads.
2. Sign in at `/login` with the super-admin credentials.
3. Navigate to `/admin` — admin panel visible.
4. DevTools → Network: API calls return 200 from `localhost:3000/api/…`.

---

### 4.3 Recommended VS Code extensions

Install these to get linting, formatting, and Angular template support working in the editor:

| Extension | ID | Purpose |
| --- | --- | --- |
| Angular Language Service | `angular.ng-template` | Template autocomplete and type-checking |
| ESLint | `dbaeumer.vscode-eslint` | Inline lint errors (both `eslint.config.mjs` files) |
| Prettier | `esbenp.prettier-vscode` | Auto-format on save (shared `.prettierrc`) |
| Error Lens | `usernamehw.errorlens` | Inline error messages without hovering |
| GitLens | `eamodio.gitlens` | Git blame, history, branch visualization |
| DotENV | `mikestead.dotenv` | Syntax highlighting for `.env` files |
| REST Client | `humao.rest-client` | Test API endpoints from `.http` files |

**Recommended VS Code workspace settings** — add to `.vscode/settings.json` at the repo root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[html]": {
    "editor.defaultFormatter": "angular.ng-template"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["backend", "ui"]
}
```

---

### 4.4 Day-to-day workflow

```bash
# 1. Get the latest code:
git pull origin main          # or: git pull origin <your-branch>

# 2. Check for new backend dependencies or migrations:
cd backend
npm install                   # safe to re-run; skips if nothing changed
npm run migration:show        # look for any [ ] (un-run) entries
npm run migration:run         # run if there are pending migrations

# 3. Check for new frontend dependencies:
cd ../ui && npm install

# 4. Start both servers (two terminal tabs):
#   Tab 1 → backend/:  npm run start:dev
#   Tab 2 → ui/:       npm start

# 5. Before committing your changes (from the relevant app directory):
npm run verify                # the canonical gate — see CONTRIBUTING.md §4
```

`npm run verify` chains the whole check set for the app you are in:

- **backend:** `typecheck → lint:check → check:cjs → test → build`
- **ui:** `typecheck → lint → format:check → test:ci → build`

Two caveats that bite people:

- **`ui`'s `format:check` covers SCSS only** (`prettier --check "src/**/*.scss"`), while `npm run format` rewrites `.ts`, `.html` *and* `.scss`. So `verify` never catches TypeScript or template formatting drift — run `npm run format` before you commit.
- **Nothing enforces `verify` for you.** There is no husky and no lint-staged, and no workflow invokes it. On a pull request only the **backend** is checked (`test.yml`); the `ui` app is entirely on the honour system.

`backend`'s `check:cjs` step is not optional decoration — it `require()`s every runtime dependency under `node --no-experimental-require-module` to prove the untransformed CommonJS graph still loads on Lambda. It exists because an ESM-only transitive dependency took production down twice; see [ARCHITECTURE §15](./docs/ARCHITECTURE.md#15-known-incidents-timeline).

---

### 4.5 Troubleshooting

**`Error: JWT_SECRET is required but missing` / `JWT_SECRET is too short (N chars)`**
`assertRequiredEnv()` runs before Nest bootstraps and refuses to start if `JWT_SECRET` is missing or shorter than 32 characters. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the output into `.env` under `JWT_SECRET=`.

**`connect ECONNREFUSED 127.0.0.1:5432` (or 5433)**
The database is not running.
- Homebrew (macOS): `brew services restart postgresql@14`
- Docker: `docker start csd-pg`

**Migrations seem to apply but the app does not see the new columns.**
Two PostgreSQL servers are fighting over port 5432 — usually a second Homebrew formula that was started at some point. Run `brew services list`, stop everything except `postgresql@14`, and confirm with `psql -d postgres -c 'SELECT version();'`. This is Incident #1 in [`docs/ARCHITECTURE.md` §15](./docs/ARCHITECTURE.md#15-known-incidents-timeline).

**`relation "migrations" does not exist`**
Migrations have never been run. Execute `npm run migration:run` inside `backend/`.

**`EADDRINUSE: address already in use :::3000`**
Another process is on port 3000. Find and stop it:
```bash
# macOS / Git Bash:
lsof -ti :3000 | xargs kill -9

# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

**`EADDRINUSE: address already in use :::4200`**
Same issue on the frontend port:
```bash
# macOS / Git Bash:
lsof -ti :4200 | xargs kill -9

# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 4200).OwningProcess | Stop-Process
```

**Infinite spinner on `http://localhost:4200`**
The backend is not running or the frontend cannot reach it. Check that `npm run start:dev` is running in `backend/` and that `curl http://localhost:3000/api/health` returns `{"status":"ok"}`.

**`npm install` fails with path-length errors on Windows**
Long paths are not enabled. Follow Step 2 of the Windows setup and restart your terminal.

**`node --version` shows the wrong version**
fnm is not activating automatically. Run `fnm use 22.17.0` manually, or confirm `eval "$(fnm env --use-on-cd ...)"` is in your shell profile.

---

## 5. Where to go next

- **Branching, commits, PR process, canonical command list** → [`CONTRIBUTING.md`](./CONTRIBUTING.md) *(§4 is the authority on commands — other documents keep only a day-to-day subset)*
- **Backend setup, migrations, common issues** → [`backend/README.md`](./backend/README.md)
- **Frontend structure, scripts, render modes, known debt** → [`ui/README.md`](./ui/README.md)
- **Architecture, data model, feature catalogue, runbooks, incidents, FAQ** → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **S3 buckets, CORS, upload operations** → [`docs/MEDIA-UPLOADS.md`](./docs/MEDIA-UPLOADS.md)
- **CloudFront security headers and the CSP** → [`infra/SECURITY-HEADERS.md`](./infra/SECURITY-HEADERS.md)
- **CI/CD pipelines** → [`.github/workflows/test.yml`](./.github/workflows/test.yml) (pre-merge) · [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) (post-merge)
