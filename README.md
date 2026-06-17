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
- **Tests / lint:** Jest 30 (unit + e2e), ESLint 9 + Prettier

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

Each folder is a NestJS feature module wired in `app.module.ts`. All admin endpoints are protected by `JwtAuthGuard` + `RolesGuard`; `super_admin` bypasses role checks. Endpoints below are relative to the module's mount point — every route is also prefixed globally with `/api`. Where the folder name differs from the mount, the actual mount is shown in parentheses.

| Module | Public endpoints | Admin endpoints | Notable functionality |
| --- | --- | --- | --- |
| **auth** | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password` | `GET /profile` | Local + JWT Passport strategies; password-reset token flow with expiry |
| **users** | — | `GET /users`, `PATCH /users/:id/role` (super_admin only, blocks self-demotion) | Role management |
| **content** (`/pages`) | `GET /pages`, `GET /pages/:slug` | full CRUD by slug | Static bilingual pages (UA/EN) with `isPublished` flag and `sortOrder` |
| **blog** | `GET /blog`, `GET /blog/featured`, `GET /blog/:slug` (paginated) | full CRUD | Bilingual posts, slug routing, cover image + image gallery + video, `isFeatured` |
| **partners** | `GET /partners` (active only) | full CRUD | Donor / Partner / Government typing, soft-delete via `isActive` |
| **cooperation** | `GET /cooperation?type=…` | full CRUD | Generic container for VACANCY / TENDER / INITIATIVE entries |
| **procurement** | `GET /procurement` (published only) | `/admin/list`, CRUD, `PATCH /:id/status`, `PATCH /:id/publish`, delete (drafts only) | 6-step tender form, Quill HTML sanitized server-side, 8 status states |
| **vacancy** (`/vacancies`) | `GET /vacancies` (non-draft), `GET /vacancies/:id` | `GET /vacancies/admin/list`, CRUD, `PATCH /vacancies/:id/publish`, `PATCH /vacancies/:id/status`, delete (drafts only) | Bilingual job posts, employment type, sanitized HTML, 7 status states |
| **testimonial** (`/testimonials`) | `GET /testimonials` (approved only), `GET /testimonials/:id` | `GET /testimonials/admin/list`, CRUD, `PATCH /testimonials/:id/approve`, `PATCH /testimonials/:id/reject`, `PATCH /testimonials/:id/status`, `PATCH /testimonials/:id/verify`, delete (rejected only) | Two-tier moderation: `status` (approval) + independent `isVerified` flag |
| **complaint** (`/complaints`) | `POST /complaints` (anonymous) | `GET /complaints` (legacy unfiltered), `GET /complaints/admin/list`, `GET /complaints/admin/export` (CSV + UTF-8 BOM), `GET /complaints/:id`, `PATCH /complaints/:id`, `PATCH /complaints/:id/status`, delete (closed only) | Anonymous submission with attachments, location, expected resolution; admin-only |
| **needs** (`/needs-forms`) | `POST /needs-forms/wash` (anonymous) | `GET /needs-forms/wash` (paginated list), `GET /needs-forms/wash/export-xlsx`, `GET /needs-forms/wash/:id`, `GET /needs-forms/wash/:id/audit-log`, `PATCH /needs-forms/wash/:id`, `PATCH /needs-forms/wash/:id/full`, `PATCH /needs-forms/wash/bulk`, `DELETE /needs-forms/wash/:id` | **WASH needs-assessment form** with 5 child relations (boreholes, towers, purification systems, pumps, equipment items) + audit log (CREATED / UPDATED / DELETED / STATUS_CHANGED), bulk status update, **6-sheet XLSX export** |
| **equipment-catalog** | `GET /equipment-catalog` | — (seed-driven) | 21 categories / ~230 items used by the WASH form dropdowns |
| **upload** | — | `POST /upload/presigned-url` | Generates 5-min S3 presigned PUT URLs (image/jpeg/png/webp) and returns the public CloudFront URL |
| **about** | `GET /about` (published sections + documents) | `GET/POST/PATCH/DELETE /about/admin/sections[/:id]`, same for `/about/admin/documents[/:id]` (admin + super_admin only) | Bilingual "About" page: editable sections and downloadable documents |

**Cross-cutting:**
- `src/common/pipes/sanitize-html.pipe.ts` — HTML sanitization for Quill content
- `src/database/data-source.ts` — standalone DataSource for the TypeORM CLI
- `src/database/run-seeds.ts` — called from `main.ts` after `app.listen()`. Currently runs **only** `seedEquipmentCatalog()` (21 categories / ~230 items). Super-admin is provisioned by a separate manual script (`src/database/seed-super-admin.ts`, run via `ts-node`); locations are not seeded — they live as a static frontend asset in `ui/src/assets/data/locations.json`.
- `backend/lambda.ts` (at the backend root, **not** in `src/`) — Lambda handler with cached Nest bootstrap, base64 binary settings for XLSX/octet-stream. Compiled into `dist/lambda.js`; `serverless.yml` references it as `dist/lambda.handler`.

---

## 3. Frontend features (`ui/src/app/features/`)

Routes are defined in `app.routes.ts` (public) and `features/admin/admin.routes.ts` (staff).

### 3.1 Public site
- **Home** (`/`) — hero, featured content, impact stats (signal-driven service)
- **About** (`/about`)
- **Blog** (`/blog`, `/blog/:slug`) — paginated list + post detail with route resolver
- **Partners** (`/partners`) — ⚠ FROZEN: route and header link are commented out until the fund provides partner logos & data. `PartnersComponent` and backend `GET /api/partners` are ready; to re-enable, uncomment the block in `ui/src/app/app.routes.ts` (search "FROZEN") and the matching nav link in `ui/src/app/layout/header/header.ts`.
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

**Option A — Homebrew (native)**

```bash
brew install postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

brew services start postgresql@16

# Verify the server is listening:
pg_isready -h localhost -p 5432   # should print "localhost:5432 - accepting connections"
```

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
# Expected: {"status":"ok"}
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
# Expected: {"status":"ok"}
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
npm run lint                  # must pass with zero errors
npm test                      # must pass
```

---

### 4.5 Troubleshooting

**`Error: JWT_SECRET must be at least 32 characters`**
The backend refuses to start if `JWT_SECRET` is missing or short. Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the output into `.env` under `JWT_SECRET=`.

**`connect ECONNREFUSED 127.0.0.1:5432` (or 5433)**
The database is not running.
- Homebrew (macOS): `brew services restart postgresql@16`
- Docker: `docker start csd-pg`

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

- **Backend setup, migrations, common issues** → [`backend/README.md`](./backend/README.md)
- **Frontend Angular CLI commands** → [`ui/README.md`](./ui/README.md)
- **Architecture, data model, runbooks, security notes, FAQ** → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **CI/CD pipeline** → [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
