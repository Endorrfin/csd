# CLAUDE.md — backend (NestJS API)

Specific guidance for the `/backend` app. Repo-wide rules and personal style preferences live in `../CLAUDE.md` — read that first.

## Stack (verified against `package.json`)

- **Runtime:** Node.js 22 (LTS). CI pins `NODE_VERSION: '22.17.0'`.
- **Framework:** NestJS 11 (`@nestjs/common@^11`, `@nestjs/core@^11`).
- **ORM:** TypeORM `0.3.28` + `pg@^8`. `synchronize: false` everywhere — migrations only.
- **DB:** PostgreSQL 16. RDS in prod with `ssl: { rejectUnauthorized: false }`; local is plain TCP.
- **Auth:** Passport (`passport-local`, `passport-jwt`) + `@nestjs/jwt`. JWT lifetime `7d` (see `auth.module.ts`).
- **Validation:** `class-validator` + `class-transformer`. Global `ValidationPipe` (see `src/main.ts`).
- **HTML sanitization:** `sanitize-html` (pure Node, Lambda-friendly). Wrapped in `src/common/pipes/sanitize-html.pipe.ts` — `isomorphic-dompurify` was rejected because it pulled `jsdom` and crashed cold-starts (see file comment).
- **AWS SDK:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for presigned PUTs to `csd-media`.
- **Exports:** `exceljs` for multi-sheet XLSX (WASH forms); manual CSV with UTF-8 BOM for complaints.
- **Lambda adapter:** `@codegenie/serverless-express`, cached across warm invocations.
- **Tests / lint:** Jest 30 (unit + e2e via `test/jest-e2e.json`); ESLint 9 + `eslint-plugin-prettier` (recommended type-checked rules + Prettier integration).

## Layout

```
backend/
├── lambda.ts                       # ⚠ Lambda handler — at backend root (NOT src/)
├── serverless.yml                  # Serverless v4 config
├── .env.example                    # local defaults (DB_PORT=5432 = Homebrew; Docker users override to 5433)
├── eslint.config.mjs
├── nest-cli.json                   # deleteOutDir: true
├── tsconfig.json                   # ESNext target, strictNullChecks ON, noImplicitAny OFF
└── src/
    ├── main.ts                     # Local bootstrap (port 3000, /api prefix, CORS http://localhost:4200, runSeeds())
    ├── app.module.ts               # Wires TypeOrmModule.forRootAsync + all feature modules
    ├── app.controller.ts           # Has GET / and GET /health (smoke-tested by CI)
    ├── common/pipes/sanitize-html.pipe.ts
    ├── database/
    │   ├── data-source.ts          # Standalone DataSource for TypeORM CLI (entities glob: src/**/*.entity.ts)
    │   ├── migrations/             # Timestamped, transactional ("each"). NEVER edit after applied.
    │   ├── run-seeds.ts            # Called from main.ts after listen() — runs ONLY seedEquipmentCatalog()
    │   ├── seed-equipment.ts
    │   └── seed-super-admin.ts     # Standalone, NOT auto-run — via `npm run seed:super-admin`
    └── modules/
        ├── auth/        users/     content/    blog/      partners/
        ├── cooperation/ procurement/ vacancy/  testimonial/ complaint/
        ├── needs/                  # WASH form: 1 parent + 5 child entities + audit log + XLSX export
        ├── equipment-catalog/      # 21 categories / ~230 items, seed-driven
        ├── upload/                 # POST /api/upload/presigned-url
        └── about/                  # Bilingual sections + documents (NOT mentioned in README)
```

## Actual REST surface (verified by `@Controller()` decorators)

All routes prefixed with `/api`. Use this table, **not** the one in the README (it has drift).

| Module            | Mount point          |
| ----------------- | -------------------- |
| auth              | `/api/auth`          |
| users             | `/api/users`         |
| content           | `/api/pages`         |
| blog              | `/api/blog`          |
| partners          | `/api/partners`      |
| cooperation       | `/api/cooperation`   |
| procurement       | `/api/procurement`   |
| vacancy           | `/api/vacancies`     |
| testimonial       | `/api/testimonials`  |
| complaint         | `/api/complaints`    |
| needs             | `/api/needs-forms`   |
| equipment-catalog | `/api/equipment-catalog` |
| upload            | `/api/upload`        |
| about             | `/api/about`         |

## Local dev

```bash
cp .env.example .env             # then edit DB_* to match your local Postgres
npm install
npm run migration:show           # confirm CLI reaches the DB
npm run migration:run            # apply pending
npm run start:dev                # http://localhost:3000/api/*
```

Seeders (`runSeeds()`) execute on every boot after `app.listen()`. They must stay idempotent — guard inserts with `findOne`/`upsert`.

## Migrations workflow

The npm scripts in `package.json` already pass `-d src/database/data-source.ts`, so use them directly:

```bash
npm run migration:generate -- src/database/migrations/<DescriptiveName>
npm run migration:run
npm run migration:show
npm run migration:revert        # reverts ONE migration; rerun for more
```

Rules — non-negotiable:
- **Never** modify a migration that has been applied to any environment (dev, RDS). Write a new one. The `migrations` table records the timestamp as executed and `migration:run` will silently skip the edited file forever.
- **Never** set `synchronize: true`. Both `app.module.ts` and `data-source.ts` hardcode `false`. Don't flip it even "for one test".
- Keep migrations idempotent-ish: use `IF NOT EXISTS` for enum value additions, guarded inserts for data-fix migrations (see `1777200000001-RemapLegacyClosedStatuses.ts`).
- One migration = one concern. CI runs `migration:show` → `migration:run` before deploy; a failing migration aborts the deploy.

## Auth & RBAC

- `JwtAuthGuard` (`auth/guards/jwt-auth.guard.ts`) — wraps `AuthGuard('jwt')`.
- `RolesGuard` (`auth/guards/roles.guard.ts`) — reads metadata set by `@Roles(...)`. **`super_admin` bypasses all role checks** (`roles.guard.ts:23-26`); keep that behavior unless you have explicit reason to change it.
- Roles enum: `public` / `donor` / `manager` / `admin` / `super_admin` (defined in `users/entities/user.entity.ts`).
- Standard protected endpoint:

```ts
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
create(@Body() dto: CreateThingDto) { /* ... */ }
```

- Public endpoints have no decorators (no global `JwtAuthGuard` is bound).
- Use `@Param('id', ParseUUIDPipe)` for UUID route params — already standard across modules.

## DTO & sanitization conventions

- Every controller method that accepts a body takes a DTO class with `class-validator` decorators. The global `ValidationPipe` runs with `whitelist: true`, `forbidNonWhitelisted: true` (per `main.ts`) — extra fields will be rejected.
- For any DTO with rich-text HTML fields (Quill output), apply `SanitizeHtmlPipe`. Its whitelist of tags/attributes is hardcoded in the pipe and **must stay in sync with** `ui/src/app/shared/config/quill.config.ts`.
- HTML field names the pipe scrubs: `shortDescription{Ua,En}`, `detailedDescription{Ua,En}`, `description{Ua,En}`, `requirements{Ua,En}`. Add new ones to `HTML_FIELDS` if you introduce HTML elsewhere.

⚠ **ValidationPipe drift between entry points:**

| Entry point  | Pipe options                                                  |
| ------------ | -------------------------------------------------------------- |
| `src/main.ts` (local) | `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — extra body fields **throw 400** |
| `lambda.ts` (prod)    | `{ whitelist: true, transform: true }` — extra fields are **silently stripped** |

Tests that rely on `forbidNonWhitelisted` (a 400 on unexpected payload) pass locally but the same payload is accepted in prod. Align both entries when you touch this — or document the asymmetry consciously.

## Binary responses (XLSX / CSV)

- `serverless.yml` lists `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `application/octet-stream` in `binaryMediaTypes`, and `lambda.ts` sets the same in `binarySettings.contentTypes`. **Both** lists must include any new binary content type or API Gateway will mangle the body.
- CSV exports must start with `﻿` (UTF-8 BOM) so Excel reads Cyrillic correctly (see `complaint.controller.ts`).
- For XLSX, set `Content-Disposition: attachment; filename="..."` and write the buffer with `res.send(buffer)`.

## Local config gotcha

`.env.example` ships `DB_PORT=5432` (matches Homebrew `postgres@14`, the README walkthrough, and every hardcoded fallback in the code: `data-source.ts`, `seed-super-admin.ts`, `run-seeds-standalone.ts`, `serverless.yml`). If you use Docker with the typical `-p 5433:5432` mapping, override `DB_PORT=5433` in your local `.env` — don't change `.env.example`.

## Deploy (Serverless v4)

- Stack name: `csd-api-${stage}`. Stage is `prod` in CI.
- Handler: `dist/lambda.handler` (compiled from `backend/lambda.ts`).
- Memory: 512 MB · Timeout: 29 s (API Gateway cap is 30 s).
- IAM grants `s3:PutObject` on `arn:aws:s3:::csd-media/*` only — don't widen without justification.
- Env vars come from GitHub Secrets in `.github/workflows/deploy.yml` → injected via `${env:VAR}` in `serverless.yml`. `useDotenv: true` lets local `serverless invoke local` pick up `.env`.

## Don'ts

- Don't run `nest start` in prod — `lambda.ts` is the entry, `main.ts` is local-only.
- Don't hand-edit `dist/` — it's wiped on every `nest build` (`deleteOutDir: true`).
- Don't import from `dist/` — only TS source.
- Don't add a global guard. Per-route `@UseGuards` is the established pattern, and several endpoints are intentionally anonymous (`POST /api/needs-forms/wash`, `POST /api/complaints`).
- Don't bypass `SanitizeHtmlPipe` for Quill fields. Frontend `DomSanitizer` is not enough — a compromised manager account could `curl` directly.
