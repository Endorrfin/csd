# CSD Backend

NestJS 11 + TypeORM + PostgreSQL. Deploys to AWS Lambda via GitHub Actions on merge to `main`.

## Stack

- **Runtime**: Node.js 22 (LTS)
- **Framework**: NestJS 11
- **DB**: PostgreSQL (local: Homebrew `postgresql@14`, prod: AWS RDS)
- **ORM**: TypeORM with migrations (no `synchronize`)
- **Auth**: JWT + role-based guards (`public` / `manager` / `admin` / `donor` / `super_admin`)
- **Deployment**: Serverless Framework → AWS Lambda + API Gateway
- **Global API prefix**: `/api` (see `src/main.ts`)
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

Node.js v22 + npm are assumed already installed.

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

Minimum required keys (must match the DB user/db you created above):

```
DB_HOST=localhost
DB_PORT=5432                                # 5433 if you went with Docker
DB_USERNAME=csd_user
DB_PASSWORD=csd_password
DB_NAME=csd_db
JWT_SECRET=<openssl rand -hex 32>           # 256-bit; ≥32 chars or app refuses to start
NODE_ENV=development
```

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

On every startup `main.ts` calls `runSeeds(app.get(DataSource))` after
`app.listen()`. As of now, that only invokes `seedEquipmentCatalog()` (21
categories / ~230 items). The other seed files in `src/database/` are
**standalone scripts**, not part of the bootstrap chain:

- `seed-super-admin.ts` — manual one-shot for provisioning or rotating the
  super-admin. See **"Provisioning the super-admin"** below.
- `run-seeds-standalone.ts` — same equipment catalog seed but runnable
  outside Nest (handy for RDS bootstrap from a CI shell).

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

```
backend/
├── lambda.ts                       # AWS Lambda entry — @codegenie/serverless-express
│                                   # adapter wrapping AppModule (sits at backend root,
│                                   # NOT inside src/; compiles to dist/lambda.js).
├── serverless.yml
├── package.json
├── nest-cli.json
├── tsconfig.json
└── src/
    ├── main.ts                     # Local bootstrap: global prefix `/api`, CORS, ValidationPipe
    ├── app.module.ts
    ├── app.controller.ts           # GET / and GET /health (smoke-tested by CI)
    ├── common/pipes/
    │   └── sanitize-html.pipe.ts
    ├── database/
    │   ├── data-source.ts          # Standalone DataSource for the TypeORM CLI
    │   ├── migrations/             # One file per schema change (timestamped)
    │   ├── run-seeds.ts            # Called from main.ts after listen() — bootstrap chain
    │   ├── run-seeds-standalone.ts # Same equipment seed, runnable outside Nest (CI bootstrap)
    │   ├── seed-equipment.ts       # Invoked by run-seeds.ts on every boot
    │   └── seed-super-admin.ts     # MANUAL one-shot script — NOT in bootstrap chain
    └── modules/
        ├── auth/                   # JWT, guards, roles
        ├── about/                  # Bilingual "About" page sections + documents
        ├── blog/                   # Blog posts
        ├── complaint/              # Public complaint submissions
        ├── content/                # Static pages (mounted at /api/pages)
        ├── cooperation/            # Cooperation section wrapper
        ├── equipment-catalog/      # 21 categories, 230 items
        ├── needs/                  # WASH needs-assessment form (mounted at /api/needs-forms)
        ├── partners/
        ├── procurement/            # Tenders
        ├── testimonial/
        ├── upload/                 # S3 presigned URLs
        ├── users/
        └── vacancy/
```

## Deployment

Merges to `main` trigger `.github/workflows/<deploy>.yml`, which:

1. Installs deps
2. Runs TypeORM migrations against RDS
3. Packages the NestJS app with Serverless Framework
4. Deploys Lambda + API Gateway
   RDS endpoint: `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com`
   API base URL: `https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod/api/*`

Secrets are injected via GitHub Secrets and Lambda environment variables
configured in `serverless.yml` — no credentials in code.

## Testing

```bash
npm run test          # Unit tests (Jest)
npm run test:e2e      # End-to-end (spins up real NestJS instance)
npm run test:cov      # Coverage
```

## Linting

```bash
npm run lint
npm run format
```

Pre-commit enforcement lives in the repo root (if configured).

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
