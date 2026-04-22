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
# PostgreSQL (via Homebrew)
brew install postgresql@14
brew services start postgresql@14
 
# Verify it's running on :5432
lsof -i :5432   # expect: postgres (homebrew) LISTEN
```

Node.js v22 + npm are assumed already installed.

### 2. Create database & user

```bash
# Create `postgres` superuser if missing (Homebrew creates your OS user only)
createuser -s postgres
 
# Create the csd database
createdb -O postgres csd
```

### 3. Environment

Copy `.env.example` to `.env` and set local credentials:

```bash
cp .env.example .env
```

Minimum required keys:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=csd
JWT_SECRET=<any-local-secret>
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

Seeders (super-admin user, equipment catalog, locations) run automatically on
first startup — see `src/database/run-seeds.ts`.

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
src/
├── database/
│   ├── data-source.ts          # Standalone DataSource for the TypeORM CLI
│   ├── migrations/             # One file per schema change (timestamped)
│   ├── run-seeds.ts            # Idempotent seeders, run on app bootstrap
│   ├── seed-equipment.ts
│   └── seed-super-admin.ts
├── modules/
│   ├── auth/                   # JWT, guards, roles
│   ├── blog/                   # Blog posts
│   ├── complaint/              # Public complaint submissions
│   ├── content/                # Static pages
│   ├── cooperation/            # Cooperation section wrapper
│   ├── equipment-catalog/      # 21 categories, 230 items
│   ├── needs/                  # WASH needs-assessment form
│   ├── partners/
│   ├── procurement/            # Tenders
│   ├── testimonial/
│   ├── upload/                 # S3 presigned URLs
│   ├── users/
│   └── vacancy/
├── main.ts                     # Bootstrap: global prefix `/api`, CORS, ValidationPipe
├── app.module.ts
└── lambda.ts                   # Lambda adapter (serverless-http)
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
