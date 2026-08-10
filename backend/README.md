# CSD Backend

NestJS 11 + TypeORM + PostgreSQL. Deploys to AWS Lambda via GitHub Actions when a pull request is merged to `main`.

## Stack

- **Runtime**: Node.js 22 (LTS)
- **Framework**: NestJS 11
- **DB**: PostgreSQL — local Homebrew `postgresql@14`, prod AWS RDS **16.13** (live AWS value, not in this repo; read 2026-07-29), e2e `postgres:16-alpine` via Testcontainers
- **ORM**: TypeORM with migrations (no `synchronize`)
- **Auth**: JWT + role-based guards (`public` / `manager` / `admin` / `donor` / `super_admin`)
- **Anti-spam**: `TurnstileGuard` on three anonymous routes — token in the `x-turnstile-token` **header**
- **Deployment**: Serverless Framework → AWS Lambda + API Gateway
- **Global API prefix**: `/api` (set in both `src/main.ts` and `lambda.ts`)

> Architecture, data model, feature write-ups and runbooks live in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md). The canonical command list is [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §4. This README covers local setup and backend-specific operations only.

## Local setup

### 1. Prerequisites

```bash
# PostgreSQL (via Homebrew) — default port 5432
brew install postgresql@14
brew services start postgresql@14

# Verify it's running on :5432
lsof -i :5432   # expect: postgres (homebrew) LISTEN
```

Alternative — Docker (typically mapped to **host port 5433** to avoid
collision with a system postgres):

```bash
docker run -d --name csd-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
lsof -i :5433   # expect: docker (or com.docker.backend) LISTEN
```

Pick **one** and set `DB_PORT` accordingly in your `.env` (5432 for
Homebrew, 5433 for the Docker mapping above). `.env.example` ships
`DB_PORT=5432` because it matches both the README walkthrough and every
hardcoded fallback in the code; Docker users override locally.

Node.js v22 + npm are assumed already installed. **Docker is additionally required for `npm run test:e2e`** — see [Testing](#testing).

> ⚠ Never run two PostgreSQL servers bound to the same port. A stray `postgresql@15`/`@16` Homebrew service on 5432 will race with `postgresql@14`; migrations apply to one, the app connects to the other. `brew services list` is the quickest check. This is Incident #1 in `../docs/ARCHITECTURE.md` §15.

### 2. Create database & user

```bash
# Create a dedicated app user and database (matches .env.example defaults)
createuser -s postgres                                       # superuser, used only as owner here
psql postgres -c "CREATE USER csd_user WITH PASSWORD 'csd_password';"
createdb -O csd_user csd_db
psql csd_db -c "GRANT ALL PRIVILEGES ON DATABASE csd_db TO csd_user;"
```

### 3. Environment

Copy `.env.example` to `.env` and set local credentials:

```bash
cp .env.example .env
```

Minimum required keys for a working local boot (must match the DB user/db you created above):

```
DB_HOST=localhost
DB_PORT=5432                                # 5433 if you went with Docker
DB_USERNAME=csd_user
DB_PASSWORD=csd_password
DB_NAME=csd_db
JWT_SECRET=<openssl rand -hex 32>           # 256-bit; ≥32 chars or app refuses to start
FRONTEND_URL=http://localhost:4200          # comma-separated ALLOWLIST, not one URL
NODE_ENV=development
```

`FRONTEND_URL` is worth reading twice: it is the CORS allowlist **and** the base for password-reset links (first entry wins). There is no `'*'` fallback — in production `assertRequiredEnv()` refuses to boot without it.

The rest of `.env.example` can stay at its shipped defaults locally:

| Key | Local default | What it does |
| --- | --- | --- |
| `AWS_S3_PRIVATE_BUCKET` | empty | private media bucket. Leave empty unless testing uploads against real S3; `serverless.yml` defaults it to `csd-media-private` in prod |
| `TURNSTILE_SECRET_KEY` | empty | unset locally ⇒ `TurnstileGuard` warns and passes, so the Recovery/Winterization forms work in dev. Unset **in production** ⇒ those three routes fail closed with 403 |
| `WINTERIZATION_HOUSEHOLD_ENABLED` | `false` | strict compare against `'true'`; anything else keeps household applications answering 422. Flipping it is a management decision, not a config tweak — see the comment in `.env.example` |

**Five runtime variables are read in code but are not in `.env.example`:** `NODE_ENV`, `PORT`, `AWS_REGION`, `AWS_S3_MEDIA_BUCKET`, `AWS_CLOUDFRONT_MEDIA_URL`. (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` are read in code too, but they are one-shot bootstrap values and appear in `.env.example` as commented-out lines on purpose.) The last two matter — `AWS_S3_MEDIA_BUCKET` defaults to `''` in code, so locally public-media presigned URLs are built against an empty bucket name **with no error**, and `AWS_CLOUDFRONT_MEDIA_URL` is never set in `serverless.yml` either, so production media URLs are direct S3. Full table: [`../docs/ARCHITECTURE.md` §9](../docs/ARCHITECTURE.md#9-environment-variables-reference).

### 4. Install & run migrations

```bash
npm install
npm run typeorm -- migration:run -d src/database/data-source.ts
```

Verify:

```bash
npm run typeorm -- migration:show -d src/database/data-source.ts
# Expect every entry marked [X]
```

### 5. Start dev server

```bash
npm run start:dev
```

API is now at `http://localhost:3000/api/*` (note the `/api` prefix — the
Angular dev server at `:4200` calls it through `ApiService`).

On every local startup `main.ts` calls `runSeeds(app.get(DataSource))` after
`app.listen()`. It invokes **two** seeds, in order:

1. `seedEquipmentCatalog()` — 21 categories / 232 items for the WASH form dropdowns.
2. `seedAboutDocuments()` — 32 register entries for the About document registry.

`lambda.ts` never calls `runSeeds()`, so **seeds never run in production.** The
only way the About registry reaches prod is the standalone script:

```bash
npm run seed:about-documents
```

It uses `INSERT … ON CONFLICT (code) DO UPDATE` and deliberately leaves
`is_published` and `access_mode` out of the update list, so re-seeding never
un-publishes a document or reverts an admin's access-mode change.

The other seed files in `src/database/` are **not** part of the bootstrap chain:

- `seed-super-admin.ts` — manual one-shot for provisioning or rotating the
  super-admin (`npm run seed:super-admin`). See **"Provisioning the super-admin"** below.
- `seed-about-documents-standalone.ts` — the script behind `npm run seed:about-documents`.
- `run-seeds-standalone.ts` — **dead code.** No npm script and no import
  references it; it seeds equipment only. Do not build on it.

Locations data is **not** seeded into the DB at all — it lives as a static
asset in the frontend (`ui/src/assets/data/locations.json`).

## Provisioning the super-admin

> ⚠ **Security notice — compromised default**
>
> Earlier versions of `seed-super-admin.ts` shipped with a hardcoded fallback
> password. **Any super_admin account that was created or used with that
> default before the rotation below must be considered compromised** and
> rotated immediately. The current script has no fallbacks — it fails fast
> if `SUPER_ADMIN_EMAIL` or `SUPER_ADMIN_PASSWORD` is missing.

The script is a standalone, manual one-shot — it is not run by Nest on
bootstrap. It reads required env vars (no defaults), validates them, then
either creates the user or rotates the password.

### Required env vars

| Variable                | Constraint                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| `SUPER_ADMIN_EMAIL`     | Valid email format                                                      |
| `SUPER_ADMIN_PASSWORD`  | Minimum 16 chars, must include upper + lower + digit + symbol           |

**Do not** persist these in any committed `.env` file. They are one-shot
bootstrap values; pass them inline.

### Generate a strong password

```bash
# 24 random base64url chars (URL-safe, no padding) — meets all complexity rules
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
# Save the output to your password manager IMMEDIATELY.
```

### Create the initial super-admin (local dev)

```bash
cd backend
 SUPER_ADMIN_EMAIL='you@example.com' \
 SUPER_ADMIN_PASSWORD='<from password manager>' \
 npm run seed:super-admin
```

(Leading space on the env-var line means `HISTCONTROL=ignorespace` keeps it
out of shell history. Add `export HISTCONTROL=ignorespace` to your shell
profile if not already there.)

### Rotate the password (existing super-admin)

```bash
cd backend
 SUPER_ADMIN_EMAIL='you@example.com' \
 SUPER_ADMIN_PASSWORD='<new strong password>' \
 npm run seed:super-admin -- --rotate-password
```

Without `--rotate-password` the script will **not** change the password of
an existing super_admin — it only ensures the role is correct. This
protects you from accidentally overwriting a working password.

### Rotate in production (against RDS)

Run from your laptop with the prod DB credentials inline. **Do not** push
these env vars into `.env.prod` or any committed file.

```bash
cd backend
 SUPER_ADMIN_EMAIL='you@example.com' \
 SUPER_ADMIN_PASSWORD='<new strong password>' \
 NODE_ENV=production \
 DB_HOST='<prod RDS host>' \
 DB_PORT='5432' \
 DB_USERNAME='<prod user>' \
 DB_PASSWORD='<prod db password>' \
 DB_NAME='<prod db>' \
 npm run seed:super-admin -- --rotate-password
```

After it runs:

1. Test login at <https://www.csd-fund.org/login> with the new password.
2. Verify the OLD password no longer works.
3. Clear clipboard / terminal scrollback (`clear`, scrollback flush in your terminal app).
4. Remove the entry from shell history if it slipped in: `history | tail`, then `history -d <number>`.

## Migrations

TypeORM CLI is wired via the `typeorm` npm script and reads
`src/database/data-source.ts`.

### Generate a migration

```bash
npm run typeorm -- migration:generate src/database/migrations/<Name> -d src/database/data-source.ts
```

### Create an empty migration

```bash
npm run typeorm -- migration:create src/database/migrations/<Name>
```

### Run pending migrations

```bash
npm run typeorm -- migration:run -d src/database/data-source.ts
```

### Revert the last migration

```bash
npm run typeorm -- migration:revert -d src/database/data-source.ts
```

### Show status

```bash
npm run typeorm -- migration:show -d src/database/data-source.ts
```

> **Never edit a migration after it has been applied to any environment.**
> If a schema change is needed, write a new migration. Editing an already-run
> migration will leave environments in an inconsistent state — the `migrations`
> table records the file as executed, so `migration:run` will skip it forever.

## Project layout

15 modules, 16 controllers, 118 route decorators, 29 entities, 14 migrations.

```
backend/
├── lambda.ts                       # AWS Lambda entry — @codegenie/serverless-express
│                                   # adapter wrapping AppModule (sits at backend root,
│                                   # NOT inside src/; compiles to dist/lambda.js).
├── serverless.yml
├── scripts/
│   ├── check-cjs-load.cjs          # `npm run check:cjs` — require()s every runtime dep
│   └── verify-baseline-against-prod-schema.ts   # read-only prod schema diff (manual)
├── test/                           # e2e: Testcontainers setup + *.e2e-spec.ts
├── package.json
├── nest-cli.json
├── tsconfig.json
└── src/
    ├── main.ts                     # Local bootstrap: assertRequiredEnv, helmet, /api prefix,
    │                               # CORS from getFrontendOrigins(), ValidationPipe, runSeeds()
    ├── app.module.ts
    ├── app.controller.ts           # GET / and GET /health (smoke-tested by CI)
    ├── common/
    │   ├── assert-required-env.ts  # Boot-blocking env checks
    │   ├── frontend-urls.ts        # Shared CORS allowlist parsing (main.ts AND lambda.ts)
    │   ├── security-headers.ts     # helmet, registered before CORS/routing
    │   ├── guards/turnstile.guard.ts
    │   └── pipes/sanitize-html.pipe.ts
    ├── database/
    │   ├── data-source.ts          # Standalone DataSource for the TypeORM CLI
    │   ├── migrations/             # One file per schema change (timestamped); 14 today
    │   ├── run-seeds.ts            # Called from main.ts after listen() — LOCAL ONLY
    │   ├── run-seeds-standalone.ts # DEAD CODE — nothing references it
    │   ├── seed-equipment.ts       # Invoked by run-seeds.ts on every local boot
    │   ├── seed-about-documents.ts # Invoked by run-seeds.ts on every local boot
    │   ├── seed-about-documents-standalone.ts  # npm run seed:about-documents (prod path)
    │   └── seed-super-admin.ts     # MANUAL one-shot script — NOT in bootstrap chain
    └── modules/
        ├── about/                  # "About" page sections + versioned document registry
        ├── auth/                   # JWT, guards, roles
        ├── blog/                   # Blog posts
        ├── complaint/              # Public complaint submissions (mounted at /api/complaints)
        ├── content/                # Static pages (mounted at /api/pages)
        ├── cooperation/            # Cooperation section wrapper
        ├── equipment-catalog/      # 21 categories, 232 items
        ├── inquiry/                # Public contact form (mounted at /api/inquiries)
        ├── needs/                  # THREE form families — WASH, Recovery, Winterization
        │                           # (mounted at /api/needs-forms; 27 routes)
        ├── partners/
        ├── procurement/            # Tenders
        ├── testimonial/
        ├── upload/                 # Four S3 presigned endpoints, two media buckets
        ├── users/
        └── vacancy/
```

Feature-by-feature write-ups (Recovery §7.7, Winterization §7.8, About registry §7.9,
shared needs infrastructure §7.10) are in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md);
the upload/bucket matrix is §8.1 there.

## Deployment

`.github/workflows/deploy.yml` fires on a **pull request being merged** into
`main` (`pull_request: types: [closed]`, filtered by `merged == true`) or on a
manual `workflow_dispatch`. It does **not** fire on a direct push to `main`.

The backend job, in order:

1. `npm ci`
2. **`npm run check:cjs`** — proves the untransformed CommonJS graph still loads
3. `migration:show`, then `migration:run` only if something is pending
4. `nest build`
5. `serverless deploy --stage prod`
6. Smoke test `GET /api/health` (5 retries)

RDS endpoint: `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com` — **not in this
repo**; `DB_HOST` comes from a GitHub Secret. Recorded here from live AWS on 2026-07-29.
API base URL: `https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod/api/*`
(this one *is* in the repo — `ui/src/environments/environment.prod.ts`).

Two ordering facts to keep in mind:

- **`check:cjs` runs before the migration steps deliberately** — never mutate prod
  RDS for a build already known to be unable to boot on Lambda. See `../docs/ARCHITECTURE.md` §15, Incident #4.
- ⚠ **Migrations still run before build and deploy.** A build or deploy failure
  leaves production already migrated against the previous code. Write every
  migration to be backwards-compatible with the currently deployed release.

The deploy workflow runs **no** lint, typecheck or tests. Secrets are injected
via GitHub Secrets and Lambda environment variables configured in
`serverless.yml` — no credentials in code. Note that `AWS_S3_PRIVATE_BUCKET` and
`WINTERIZATION_HOUSEHOLD_ENABLED` are not in the deploy step's `env:` block, so
both always take their `serverless.yml` defaults.

## Testing

```bash
npm run test          # Unit tests (Jest) — 17 spec files under src/
npm run test:e2e      # End-to-end — 1 spec file under test/ — REQUIRES DOCKER
npm run test:cov      # Coverage
```

**`test:e2e` needs a running Docker daemon.** `test/setup-pg.ts` starts a
`postgres:16-alpine` container via Testcontainers, runs **all** migrations
against it, and the suite executes with `maxWorkers: 1`. Never mock the database
in e2e tests. Note the version: the e2e container is PostgreSQL 16 (matching
prod) while local dev is 14.

`.github/workflows/test.yml` ("PR Checks") runs this on every pull request
against `main`: `npm ci` → `typecheck` → `lint:check` → `check:cjs` →
`npm test` → `build` → `docker pull postgres:16-alpine` → `test:e2e`. That is
the whole `verify` chain plus e2e; `build` runs before e2e so a broken build
fails in seconds rather than after the image pull.

⚠ Still **not** covered: `npm run format`. The workflow has no formatting step
for this app at all — the `ui` job's `format:check` is SCSS-only and covers
nothing here.

## Linting and the verify chain

```bash
npm run verify        # typecheck → lint:check → check:cjs → test → build
```

`npm run verify` is the canonical pre-commit gate (`../CONTRIBUTING.md` §4).
The individual steps:

| Script | Notes |
| --- | --- |
| `npm run lint` | ESLint **with `--fix`** — rewrites files. Fine locally, wrong in CI |
| `npm run lint:check` | ESLint without `--fix`. This is what `test.yml` runs |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.json` |
| `npm run check:cjs` | `require()`s every runtime dependency under `node --no-experimental-require-module`. Jest cannot catch this class of failure — it downlevels ESM-only deps to CJS |
| `npm run format` | Prettier write over `src/**/*.ts` and `test/**/*.ts` |
| `npm run verify:prod-baseline` | Read-only diff of the baseline migration against the prod schema. Manual; no workflow runs it |

**Nothing enforces any of this on your machine.** There is no husky and no
lint-staged configured anywhere in the repo — running `verify` before you push
is a habit, not a hook.

## Known gaps — do not assume these exist

- No Swagger/OpenAPI, no `@nestjs/throttler`, no global exception filter, no
  global interceptors, no CloudWatch alarms, no X-Ray.
- **Password-reset links are logged, not emailed** (`auth.service.ts`, marked
  `TODO: Replace with EmailService`). There is no SMTP integration.
- No CloudWatch log-retention setting in either `serverless.yml`, so the default
  is *never expire*.
- The IAM role has no `s3:DeleteObject` — deleting a needs form leaves its S3
  objects behind, by necessity rather than by choice.
- `RolesGuard` returns `true` when `@Roles()` is absent or empty, so
  `@UseGuards(RolesGuard)` without the decorator is a silent no-op.

## Common issues

**`No migrations are pending` but `migration:show` lists `[ ]` entries.**
The `migrations` table already contains a row for that timestamp (likely from a
previous botched run). Either delete the stale row or apply the schema change
manually and leave the row in place.

**Lambda returns `Cannot POST /<route>`.**
The client is hitting `environment.apiUrl/<route>` without the `/api` prefix.
Use `ApiService` on the frontend — it adds the prefix centrally.

**`column "X" does not exist`.**
The migration that was supposed to add the column wasn't actually run on the
environment the backend is connected to. Check `SELECT * FROM migrations;` and
compare with the `migrations/` folder. Never patch a completed migration —
write a new one.
