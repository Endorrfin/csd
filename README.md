# CSD Fund — Web Portal

Web platform for the Charitable Fund **"Centre for Support and Development"** — WASH recovery, reconstruction, and shelter support in Ukraine.

**Live:** https://www.csd-fund.org

The repository is a monorepo with two deployable apps:

```
csd-fund/
├── backend/   # NestJS 11 REST API → AWS Lambda + API Gateway + RDS
├── ui/        # Angular 21 SSR app → AWS Lambda + S3 + CloudFront
├── docs/      # Architecture & operations guide
└── .github/workflows/deploy.yml   # Single CI pipeline for both apps
```

---

## 1. Technology stack

### Backend (`backend/`)
- **Runtime:** Node.js 22 (LTS)
- **Framework:** NestJS 11 + TypeScript 5.7
- **ORM / DB:** TypeORM 0.3 + PostgreSQL 16 (local Homebrew, prod AWS RDS, SSL in prod)
- **Auth:** Passport (`passport-local`, `passport-jwt`) + `@nestjs/jwt`, role-based guards (`public` / `donor` / `manager` / `admin` / `super_admin`)
- **Validation & sanitization:** `class-validator`, `class-transformer`, global `ValidationPipe({ whitelist: true, transform: true })`, `sanitize-html` via custom `SanitizeHtmlPipe` for Quill rich-text fields
- **File storage:** AWS S3 via `@aws-sdk/client-s3` + presigned PUT URLs (`@aws-sdk/s3-request-presigner`), bucket `csd-media`, CloudFront-fronted
- **Reports:** `exceljs` for multi-sheet XLSX export of WASH submissions, manual CSV with UTF-8 BOM for complaints
- **Lambda adapter:** `@codegenie/serverless-express` (cached bootstrap across warm invocations)
- **API prefix:** `/api` (set globally in `lambda.ts` and `main.ts`)
- **Tests / lint:** Jest (unit + e2e), ESLint 9 + Prettier

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
- PostgreSQL 16 (RDS prod: `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com`)
- TypeORM CLI migrations only (`synchronize: false`); migrations live in `backend/src/database/migrations/`
- Idempotent seeders run on app bootstrap (`run-seeds.ts`): super-admin user, equipment catalogue (21 categories / 230 items), locations

### Infrastructure & deployment
- **Cloud:** AWS, region `eu-central-1`
- **Backend:** Serverless Framework v4 → AWS Lambda (`csd-api-prod-api`) + API Gateway, env injected from GitHub Secrets
- **Frontend:** static build (hashed assets) → S3 (`csd-fund-static`) with long cache; SSR → AWS Lambda (`csd-ssr-prod-ssr`) + API Gateway; CloudFront distribution `E3U465AMSVR9PN` in front of both with `/*` invalidation on each deploy
- **DB:** AWS RDS PostgreSQL
- **Media:** S3 bucket `csd-media`, served through CloudFront
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`) — triggers on PR-merge to `main` or `workflow_dispatch`. Pipeline: install → `migration:show` → conditional `migration:run` → build → `serverless deploy` → smoke test (`/api/health` for backend, `<app-root>` presence for frontend) → CloudFront invalidate. Per-job summaries with AWS Console links and rollback hints.

---

## 2. Backend modules (`backend/src/modules/`)

Each folder is a NestJS feature module wired in `app.module.ts`. All admin endpoints are protected by `JwtAuthGuard` + `RolesGuard`; `super_admin` bypasses role checks.

| Module | Public endpoints | Admin endpoints | Notable functionality |
| --- | --- | --- | --- |
| **auth** | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password` | `GET /profile` | Local + JWT Passport strategies; password-reset token flow with expiry |
| **users** | — | `GET /users`, `PATCH /users/:id/role` (super_admin only, blocks self-demotion) | Role management |
| **content** | `GET /content`, `GET /content/:slug` | full CRUD by slug | Static bilingual pages (UA/EN) with `isPublished` flag and `sortOrder` |
| **blog** | `GET /blog`, `GET /blog/featured`, `GET /blog/:slug` (paginated) | full CRUD | Bilingual posts, slug routing, cover image + image gallery + video, `isFeatured` |
| **partners** | `GET /partners` (active only) | full CRUD | Donor / Partner / Government typing, soft-delete via `isActive` |
| **cooperation** | `GET /cooperation?type=…` | full CRUD | Generic container for VACANCY / TENDER / INITIATIVE entries |
| **procurement** | `GET /procurement` (published only) | `/admin/list`, CRUD, `PATCH /:id/status`, `PATCH /:id/publish`, delete (drafts only) | 6-step tender form, Quill HTML sanitized server-side, 8 status states |
| **vacancy** | `GET /vacancy` (non-draft) | `/admin/list`, CRUD, `PATCH /:id/publish`, `PATCH /:id/status`, delete (drafts only) | Bilingual job posts, employment type, sanitized HTML, 7 status states |
| **testimonial** | `GET /testimonial` (approved only) | `/admin/list`, CRUD, `PATCH /:id/status`, `PATCH /:id/verify`, delete (rejected only) | Two-tier moderation: `status` (approval) + independent `isVerified` flag |
| **complaint** | `POST /complaint` (anonymous) | `/admin/list`, `/admin/export` (CSV + UTF-8 BOM), CRUD, `PATCH /:id/status`, delete (closed only) | Anonymous submission with attachments, location, expected resolution; admin-only |
| **needs** | `POST /needs/wash` (anonymous) | `GET /needs/wash`, `GET /wash/export-xlsx`, `GET /wash/:id`, `GET /wash/:id/audit-log`, `PATCH /:id`, `PATCH /:id/full`, `PATCH /wash/bulk` | **WASH needs-assessment form** with 5 child relations (boreholes, towers, purification systems, pumps, equipment items) + audit log (CREATED / UPDATED / DELETED / STATUS_CHANGED), bulk status update, **6-sheet XLSX export** |
| **equipment-catalog** | `GET /equipment-catalog` | — (seed-driven) | 21 categories / ~230 items used by the WASH form dropdowns |
| **upload** | — | `POST /upload/presigned-url` | Generates 5-min S3 presigned PUT URLs (image/jpeg/png/webp) and returns the public CloudFront URL |

**Cross-cutting:**
- `src/common/pipes/sanitize-html.pipe.ts` — HTML sanitization for Quill content
- `src/database/data-source.ts` — standalone DataSource for the TypeORM CLI
- `src/database/run-seeds.ts` — bootstrap seeders (super-admin, equipment catalogue, locations)
- `src/lambda.ts` — Lambda handler with cached Nest bootstrap, base64 binary settings for XLSX/octet-stream

---

## 3. Frontend features (`ui/src/app/features/`)

Routes are defined in `app.routes.ts` (public) and `features/admin/admin.routes.ts` (staff).

### 3.1 Public site
- **Home** (`/`) — hero, featured content, impact stats (signal-driven service)
- **About** (`/about`)
- **Blog** (`/blog`, `/blog/:slug`) — paginated list + post detail with route resolver
- **Partners** (`/partners`)
- **Activity map** (`/activity-map`) — Leaflet map with marker clustering, category sidebar, signal-based filtering, data from `assets/data/activities.json`
- **Cooperation** (`/cooperation/...`) with four child feature areas:
    - `procurement` — list / detail / submit form (multi-step)
    - `vacancy` — list / detail / submit form
    - `testimonial` — list / submit form
    - `complaint` — anonymous complaint form
- **Needs** (`/needs/wash-form`) — full WASH needs-assessment form with dynamic child sections (borehole, tower, purification, pump, equipment items pulled from the catalogue)
- **Contact** (`/contact`)
- **Auth** — `/login`, `/register`, `/forgot-password`, `/reset-password`

### 3.2 Admin panel (`/admin`, lazy-loaded, `managerGuard`)
- **WASH forms** — list + detail view, audit log, status workflow, bulk update, XLSX export
- **Procurements** — list / moderation
- **Vacancies** — list / moderation
- **Testimonials** — moderation (approve / reject + verify toggle)
- **Complaints** — list with drawer (admin+ only via `adminGuard`)
- **Users management** — role administration (super-admin only via `superAdminGuard`)

### 3.3 Shared / core
- `core/services/api.service.ts` — central HTTP client prepending `/api`
- `core/services/auth.service.ts` — JWT storage + role helpers (`isManager`, `isAdmin`, `isSuperAdmin`)
- `core/interceptors/auth.interceptor.ts` — attaches `Authorization: Bearer …`
- `shared/components/` — `carousel`, `location-selector`, `sticky-cta`
- `shared/services/location.service.ts` + `assets/data/locations.json` — Ukraine oblast / hromada selector
- `shared/pipes/quill-html.pipe.ts` + `shared/config/quill.config.ts` — safe rendering of sanitized Quill HTML
- `shared/directives/fade-in-on-scroll.directive.ts` — reveal animation
- `assets/i18n/{ua,en}.json` — full UI translations

---

## 4. Where to go next

- **Backend setup, migrations, common issues** → [`backend/README.md`](./backend/README.md)
- **Frontend Angular CLI commands** → [`ui/README.md`](./ui/README.md)
- **Architecture, data model, runbooks, security notes, FAQ** → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **CI/CD pipeline** → [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
