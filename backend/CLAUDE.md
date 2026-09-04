# CLAUDE.md — backend (NestJS API)

Specific guidance for the `/backend` app. Repo-wide rules and personal style preferences live in `../CLAUDE.md` — read that first.

This file holds the **rules an agent must not break**. Everything descriptive — the full module inventory, the env-var reference, the setup walkthrough, the known-gaps list — lives in [`README.md`](./README.md) and [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md). Do not duplicate them here; when they disagree with the code, the code wins.

## Stack (verified against `package.json`)

- **Runtime:** Node.js 22 (LTS). Both workflows pin `NODE_VERSION: '22.17.0'`; `.nvmrc` at the repo root is the local pin.
- **Framework:** NestJS 11 (`@nestjs/common@^11`, `@nestjs/core@^11`).
- **ORM:** TypeORM `^0.3.28` + `pg@^8`. `synchronize: false` everywhere — migrations only. 14 migrations on `main`.
- **DB:** **local dev PostgreSQL 14, e2e `postgres:16-alpine` via Testcontainers, production 16.13 on RDS.** The dev/prod major skew is real and deliberate — migrations are authored on 14 and applied to 16 (`ARCHITECTURE.md` §13). RDS uses `ssl: { rejectUnauthorized: false }`; local is plain TCP.
- **Auth:** Passport (`passport-local`, `passport-jwt`) + `@nestjs/jwt`. JWT lifetime `7d`, hardcoded in `auth.module.ts` — not an env var.
- **Validation:** `class-validator` + `class-transformer`. Global `ValidationPipe`, configured **identically** in both entry points (see below).
- **HTML sanitization:** `sanitize-html`, **pinned exact at `2.17.5`** — see the Don'ts. Wrapped in `src/common/pipes/sanitize-html.pipe.ts`; `about.service.ts` has a *second, independent* config (`QUILL_SANITIZE_OPTIONS`).
- **AWS SDK:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. One presigned **PUT** endpoint, three presigned **POST** endpoints — matrix in `ARCHITECTURE.md` §8.1, procedure in `../docs/MEDIA-UPLOADS.md`.
- **Exports:** `exceljs` for multi-sheet XLSX (WASH, Recovery and Winterization forms); hand-rolled CSV with a UTF-8 BOM in **two** places — `complaint.controller.ts` and `inquiry.controller.ts`. There is no shared CSV helper, so a fix to one does not reach the other.
- **Lambda adapter:** `@codegenie/serverless-express`, cached across warm invocations.
- **Tests / lint:** Jest 30 — 17 unit suites under `src/`, 1 e2e suite under `test/` (`test/jest-e2e.json`, **needs Docker**: Testcontainers starts `postgres:16-alpine` and runs every migration). ESLint 9 + `eslint-plugin-prettier`.

## Layout

```
backend/
├── lambda.ts                       # ⚠ Lambda handler — at backend root (NOT src/)
├── serverless.yml                  # Serverless v4 config
├── scripts/
│   ├── check-cjs-load.cjs          # `npm run check:cjs` — the ESM cold-start guard (see Don'ts)
│   └── verify-baseline-against-prod-schema.ts
├── test/jest-e2e.json              # tracked via the `!test/jest-e2e.json` negation in .gitignore
├── .env.example                    # local defaults (DB_PORT=5432 = Homebrew postgresql@14; Docker users override to 5433)
├── eslint.config.mjs
├── nest-cli.json                   # deleteOutDir: true
├── tsconfig.json                   # target ES2023, module/moduleResolution nodenext,
│                                   # strictNullChecks ON, noImplicitAny OFF
└── src/
    ├── main.ts                     # Local bootstrap: assertRequiredEnv() → helmet → /api prefix
    │                               # → CORS from getFrontendOrigins() → ValidationPipe → listen → runSeeds()
    ├── app.module.ts               # Wires TypeOrmModule.forRootAsync + all 15 feature modules
    ├── app.controller.ts           # GET / and GET /health → { status, timestamp } (smoke-tested by CI)
    ├── common/
    │   ├── assert-required-env.ts  # boot-blocking env checks, called by BOTH entry points
    │   ├── frontend-urls.ts        # getFrontendOrigins() / getCanonicalFrontendUrl() — the CORS allowlist
    │   ├── security-headers.ts     # shared helmet config, applied by BOTH entry points
    │   ├── guards/turnstile.guard.ts
    │   └── pipes/sanitize-html.pipe.ts
    ├── database/
    │   ├── data-source.ts          # Standalone DataSource for the TypeORM CLI
    │   ├── migrations/             # 14 files. Timestamped, transactional ("each"). NEVER edit after applied.
    │   ├── run-seeds.ts            # main.ts only — runs seedEquipmentCatalog() THEN seedAboutDocuments()
    │   ├── seed-equipment.ts       # 21 categories / 232 items
    │   ├── seed-about-documents.ts
    │   ├── seed-about-documents-standalone.ts   # `npm run seed:about-documents` — the ONLY way prod gets the registry
    │   ├── seed-super-admin.ts     # standalone, NOT auto-run — via `npm run seed:super-admin`
    │   └── run-seeds-standalone.ts # ⚠ DEAD CODE — no npm script, no import. Don't extend it; delete it or leave it.
    └── modules/                    # 15 modules — see the mount table below
```

## Actual REST surface (verified by `@Controller()` decorators)

All routes are prefixed `/api` (`setGlobalPrefix('api')` in both entry points). **15 modules**, not 14.

| Module            | Mount point              | Notes |
| ----------------- | ------------------------ | ----- |
| auth              | `/api/auth`              | `register`, `login`, `forgot-password`, `reset-password` are all anonymous |
| users             | `/api/users`             | |
| content           | `/api/pages`             | Quill HTML, **not** server-sanitized |
| blog              | `/api/blog`              | Quill HTML, **not** server-sanitized |
| partners          | `/api/partners`          | frontend route is FROZEN (commented out in `app.routes.ts`) |
| cooperation       | `/api/cooperation`       | |
| procurement       | `/api/procurement`       | `GET` returns every **non-draft** record, not published-only |
| vacancy           | `/api/vacancies`         | |
| testimonial       | `/api/testimonials`      | `POST` is anonymous; `remove()` hard-deletes **any** testimonial |
| complaint         | `/api/complaints`        | `POST` anonymous; every admin route is `MANAGER, ADMIN, SUPER_ADMIN` |
| **inquiry**       | `/api/inquiries`         | contact form. `POST` anonymous. Missing from every pre-2026-07 document |
| needs             | `/api/needs-forms`       | **three** form families — 27 routes in one controller |
| equipment-catalog | `/api/equipment-catalog` | seed-driven, 21 categories / 232 items |
| upload            | `/api/upload`            | four endpoints — `ARCHITECTURE.md` §8.1 |
| about             | `/api/about`             | bilingual sections **and** the document registry (documents + files) |

`needs/` is **not** WASH-only. It carries three form families — WASH, Recovery (`POST /needs-forms/recovery`) and Winterization (`POST /needs-forms/winterization`) — plus shared attachment, form-number-sequence and audit-log entities. Feature write-ups: `ARCHITECTURE.md` §7.3, §7.7, §7.8, §7.10. Do not add a fourth family without reading §7.10 first — the number sequence and the audit log are shared.

## npm scripts

`../CONTRIBUTING.md` §4 is the canonical reference. The load-bearing ones:

| Script | What it is |
| --- | --- |
| `npm run verify` | `typecheck → lint:check → check:cjs → test → build`. The pre-push gate |
| `npm run lint` | ESLint **with `--fix`** — it rewrites your files. Never use it in CI |
| `npm run lint:check` | ESLint without `--fix`. This is what `test.yml` runs |
| `npm run check:cjs` | `require()`s every runtime dependency under `node --no-experimental-require-module`. Guards against the ESM cold-start crash — see Don'ts |
| `npm run test:e2e` | Testcontainers `postgres:16-alpine`, `maxWorkers: 1`. **Needs Docker.** Not part of `verify` |
| `npm run seed:about-documents` | Standalone About-registry seed. The only path to prod |
| `npm run seed:super-admin` | Standalone. Not in the bootstrap chain |
| `npm run verify:prod-baseline` | Read-only diff of the baseline migration against the prod schema. No workflow runs it |

There is **no `seed:equipment` script** and **no `format:check` script** in this app — `format` is write-only, over `src/**/*.ts` and `test/**/*.ts`. Do not reference either in a doc or a workflow.

## Local dev

```bash
cp .env.example .env             # then edit DB_* to match your local Postgres
npm install
npm run migration:show           # confirm the CLI reaches the DB
npm run migration:run            # apply pending
npm run start:dev                # http://localhost:3000/api/*
```

`runSeeds()` executes on every local boot after `app.listen()` and runs **two** seeds: `seedEquipmentCatalog()` then `seedAboutDocuments()`. Both must stay idempotent — guard inserts with `findOne`/`upsert`.

`lambda.ts` **never** calls `runSeeds()`, so seeds never run in production. New reference data needs either a data migration or a standalone script wired to an npm script.

## Boot contract — both entry points

`main.ts` (local) and `lambda.ts` (prod) apply the same five things. What must stay in lockstep is the **configuration**, not the statement order — the two files already order the middle three differently (`main.ts`: prefix → CORS → pipe; `lambda.ts`: CORS → pipe → prefix), which is harmless because Nest applies them at `init`/`listen`. Don't "align" them for cosmetics.

1. `assertRequiredEnv()` — **before** `NestFactory.create()`. Throws (does not `process.exit`) if `JWT_SECRET` is missing or under 32 chars; in production also if `FRONTEND_URL` is empty or contains a non-HTTPS origin. On Lambda this fails the init phase, which is intended.
2. `app.use(securityHeaders())` — the shared helmet config from `common/security-headers.ts`, registered **before** CORS and routing in both. API CSP is locked to `default-src 'none'`; HSTS `max-age=15552000` (180 d). **This is not the browser-facing CSP** — that one is on CloudFront, documented in `../infra/SECURITY-HEADERS.md`. The two HSTS values differ on purpose.
3. `app.setGlobalPrefix('api')`.
4. `app.enableCors({ origin: getFrontendOrigins() })` — a comma-separated allowlist parsed from `FRONTEND_URL` by the shared `common/frontend-urls.ts`, not hardcoded in either entry point, and `credentials` is deliberately off (auth is a Bearer header, no cookies). ⚠ `getFrontendOrigins()` falls back to `DEFAULT_FRONTEND_URL = 'http://localhost:4200'` when `FRONTEND_URL` is empty — that fallback is **load-bearing for local dev and e2e**, and production is protected from it by `assertRequiredEnv()`. Don't delete it as a stray hardcoded localhost.
5. `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — **identical options in both files.** The old prod/local asymmetry is gone; unexpected body fields return **400 everywhere**. If you touch either pipe config, change both in the same commit.

Only `main.ts` imports `dotenv/config` (Lambda gets env vars from the runtime) and only `main.ts` calls `runSeeds()`.

## Auth, RBAC & Turnstile

- `JwtAuthGuard` (`auth/guards/jwt-auth.guard.ts`) — wraps `AuthGuard('jwt')`.
- `RolesGuard` (`auth/guards/roles.guard.ts`) — reads metadata set by `@Roles(...)`. Two behaviours worth knowing before you touch it:
  - **`super_admin` bypasses all role checks.** Keep it unless you have an explicit reason.
  - **It returns `true` when `@Roles()` is absent or empty.** `@UseGuards(RolesGuard)` on its own is a silent no-op, not a lock. Always pair it with `@Roles(...)`.
- Roles enum: `public` / `donor` / `manager` / `admin` / `super_admin` (`users/entities/user.entity.ts`).
- Standard protected endpoint:

```ts
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
create(@Body() dto: CreateThingDto) { /* ... */ }
```

- Use `@Param('id', ParseUUIDPipe)` for UUID route params — already standard across modules.

**Public endpoints are not all bare.** There is no global guard, and these carry no guard decorator at all:

`POST /api/auth/{register,forgot-password,reset-password}` · `POST /api/needs-forms/wash` · `POST /api/complaints` · `POST /api/testimonials` · `POST /api/inquiries` · `POST /api/upload/testimonial-presigned`

`POST /api/auth/login` is anonymous in the JWT sense but **does** carry `@UseGuards(AuthGuard('local'))` — the Passport local strategy is what validates the credentials. Removing it would make login accept anything.

Three public routes **do** carry `TurnstileGuard`:

`POST /api/needs-forms/recovery` · `POST /api/needs-forms/winterization` · `POST /api/upload/needs-presigned`

### Turnstile contract

- **Transport is the `x-turnstile-token` request header, never the body.** `forbidNonWhitelisted: true` would reject a body field unless it were added to every DTO. The header is allowlisted in `serverless.yml`'s API Gateway CORS block as `X-Turnstile-Token` — add it there too if you ever guard a new route.
- **Fail-closed in production:** secret unset → 403 on the guarded routes only; the rest of the API keeps serving. App boot is deliberately *not* gated on `TURNSTILE_SECRET_KEY`.
- **Bypass in non-production:** secret unset → the guard logs a warning and passes, so local dev and e2e need no Cloudflare credentials.
- Applied per-route via `@UseGuards(TurnstileGuard)`; the guard must also be listed in the owning module's `providers`. WASH and complaint submissions are **not** retrofitted yet — that is a known gap, not an oversight to fix in passing.

## DTO & sanitization conventions

- Every controller method that accepts a body takes a DTO class with `class-validator` decorators, and the global `ValidationPipe` rejects extra fields with 400. The one exception is `POST /api/upload/presigned-url`, which takes an **inline body type instead of a DTO** — so `ValidationPipe` never runs on it and a bad MIME surfaces as a **500**, not a 400. If you give it a DTO, that behaviour changes; say so in the PR.
- Server-side sanitization is **narrow**, and widening it is a behaviour change:
  - `SanitizeHtmlPipe` is applied to exactly **five routes** — procurement create/update and vacancy create/update/`:id/publish`.
  - About sections are sanitized by a **separate config inside `about.service.ts`** (`QUILL_SANITIZE_OPTIONS`), not by the pipe. Two independent sanitizer configs exist; changing one does not change the other.
  - **Blog and `/api/pages` accept Quill HTML with no server-side sanitization at all.** That is documented, not accidental (`ARCHITECTURE.md` §14.2).
- The pipe's tag/attribute whitelist **must stay in sync with** `ui/src/app/shared/config/quill.config.ts`.
- Fields the pipe scrubs (`HTML_FIELDS`): `shortDescription{Ua,En}`, `detailedDescription{Ua,En}`, `description{Ua,En}`, `requirements{Ua,En}`. Add new ones there if you introduce HTML elsewhere.
- **Upload DTOs pin the S3 key prefix** with `@Matches` (`recovery-attachment.dto.ts`, `winterization-attachment.dto.ts`, `create-about-document-file.dto.ts`). A key that does not match the expected prefix is rejected at DTO level, before any service code sees it.

## Binary responses (XLSX / CSV)

- `serverless.yml` now lists `'*/*'` in `binaryMediaTypes`, so API Gateway no longer needs per-type curation. **`lambda.ts`'s `binarySettings.contentTypes` still does** — add any new binary content type there or the body will be mangled.
- CSV exports must start with `'﻿'` (UTF-8 BOM) so Excel reads Cyrillic correctly — see `complaint.controller.ts` and `inquiry.controller.ts`, which each do it independently.
- For XLSX, set `Content-Disposition: attachment; filename="..."` and write the buffer with `res.send(buffer)`.

## Local config gotcha

`.env.example` ships `DB_PORT=5432` — Homebrew `postgresql@14`, matching `README.md` and every hardcoded fallback (`data-source.ts`, `seed-super-admin.ts`, `serverless.yml`). If you run Docker with the usual `-p 5433:5432` mapping, override `DB_PORT=5433` in your own `.env`; don't change `.env.example`.

`postgresql@15` is also installed on Vasyl's machine but not started. If it ever starts it contends for port 5432 — that is Incident #1 in `ARCHITECTURE.md` §15.

Full env-var reference — including the variables read in code but **absent from `.env.example`** — is `ARCHITECTURE.md` §9. Do not maintain a second copy here.

## Deploy (Serverless v4)

- Stack `csd-api-${stage}`; `prod` in CI. Handler `dist/lambda.handler`. Memory 512 MB · timeout 29 s (API Gateway caps at 30 s).
- **IAM covers two buckets**, not one:
  - `s3:PutObject` on `arn:aws:s3:::csd-media/*`
  - `s3:PutObject` + `s3:GetObject` on `arn:aws:s3:::${custom.privateMediaBucket}/*` (defaults to `csd-media-private`)
  - There is **no `s3:DeleteObject` anywhere.** That is why deleting a needs form orphans its S3 objects — the code could not remove them if it tried. Adding delete is a security decision, not a cleanup.
- Env vars come from GitHub Secrets in `.github/workflows/deploy.yml` → `${env:VAR}` in `serverless.yml`. **`AWS_S3_PRIVATE_BUCKET` and `WINTERIZATION_HOUSEHOLD_ENABLED` are not in the workflow's deploy-step `env:` block**, so both always take their `serverless.yml` defaults (`csd-media-private`, `'false'`) regardless of what is configured in GitHub. Setting a GitHub secret for either has no effect until the workflow is changed too.
- `useDotenv: true` lets `serverless invoke local` pick up `.env`.

## Known gaps — do not "fix" these blindly

Each of these looks like a bug and is a recorded decision. The full list is in [`README.md` § Known gaps](./README.md); the ones most likely to trigger a wrong edit:

- **Password-reset links are logged, not emailed** (`auth.service.ts`, `TODO: Replace with EmailService`). There is no SMTP integration. Don't wire one in as a side effect of another change.
- **No Swagger/OpenAPI, no `@nestjs/throttler`, no global interceptors.** Their absence is deliberate for Lambda cold-start size. Adding any of them is its own PR with its own justification. (A global **exception filter** now exists — `APP_FILTER` → `AllExceptionsFilter`; see the logging section below.)
- **`WINTERIZATION_HOUSEHOLD_ENABLED` is off and must stay off** until a management decision. The household scenario is fully implemented (DTO, columns, UI card) and the service answers 422 for `applicantType='household'` unless the value is exactly `'true'`. The rationale — Ukrainian tax-reporting duties and unresolved retention rules for the vulnerability data — is in `.env.example`. Flipping it is not a code decision.
- **`run-seeds-standalone.ts` is dead code.** Don't extend it thinking it is the prod seed path; `seed-about-documents-standalone.ts` is.
- **Log retention is 30 days** on both log groups (`logRetentionInDays`), and nine CloudWatch alarms publish to a per-stack SNS topic. Both are prod-only (`Condition: IsProd`) — a staging deploy creates neither.
- The stale-looking `ssr-lambda.mjs` in `ui/` and the frozen `partners` route are also deliberate — see `ui/CLAUDE.md`.

## Migrations workflow

The npm scripts already pass `-d src/database/data-source.ts`:

```bash
npm run migration:generate -- src/database/migrations/<DescriptiveName>
npm run migration:run
npm run migration:show
npm run migration:revert        # reverts ONE migration; rerun for more
```

Rules — non-negotiable:

- **Never** modify a migration that has been applied to any environment. Write a new one. The `migrations` table records the timestamp as executed and `migration:run` will silently skip the edited file forever.
- **Never** set `synchronize: true`. Both `app.module.ts` and `data-source.ts` hardcode `false`. Don't flip it even "for one test".
- Keep migrations idempotent-ish: `IF NOT EXISTS` for enum value additions, guarded inserts for data-fix migrations (see `1777200000001-RemapLegacyClosedStatuses.ts`).
- One migration = one concern.
- **You are authoring on PostgreSQL 14 and it will run on 16.13.** Avoid syntax that only one of them accepts, and prefer `npm run test:e2e` (which runs on 16-alpine) over local-only confidence.
- `deploy.yml` runs `migration:show` → `migration:run` **before** `serverless deploy`, and `check:cjs` before both — a build known not to boot never mutates prod RDS. A failing migration aborts the deploy.

## Logging (PR 1 — read before adding a log line)

Configuration lives in **one** place: `src/common/logger/logger.config.ts`. Do not
add a second logger, a `pino-pretty` transport, or per-module options.

- **Never `console.*` outside `src/database/`.** Those seed scripts are CLI tools
  and `console` is right there. Everywhere else it bypasses the serializers, and
  `console.error('...', err)` prints every own property of the error — which is
  how a TypeORM `QueryFailedError` used to put `.query` and `.parameters` (an
  applicant's name and phone) into CloudWatch. Inject `PinoLogger` with
  `@InjectPinoLogger(MyService.name)`, or use `new Logger()` from `@nestjs/common`
  — both route through pino and both inherit `requestId` automatically.
- **Log objects, not interpolated strings:** `this.logger.error({ err, auditOp }, 'audit log write failed')`.
  The message must stay stable — it is what a CloudWatch metric filter matches;
  put what varies in fields, which is what Logs Insights groups by.
- **Never log a request body**, and do not turn `pino-http` body logging on. This
  API carries PSEA complaints, needs forms and defect acts.
- The `req` serializer is an allow-list: path **without** the query string, query
  parameter **names** only, three headers, no IP. The `err` serializer is an
  allow-list too: `type`/`message`/`stack`/`code` and one level of `cause`.
  Widening either is a security decision — `logger.config.spec.ts` will fail.
- **Errors are logged by the framework, not by you.** `AllExceptionsFilter`
  attaches the exception to `res.err` and `pino-http` emits exactly one line per
  request. Do not `catch` an error only to log and rethrow it — that duplicates
  the line and the stack.
- Both entry points do `bufferLogs: true` → `useLogger()` → **`app.flushLogs()`**.
  The explicit flush is load-bearing in `lambda.ts`: Nest drains the buffer inside
  `app.listen()`, which a Lambda never calls, so without it every Nest log line is
  swallowed for the life of the container. Keep the three lines together.
- `LOG_LEVEL` sets the level (default `info`; an unknown value falls back rather
  than throwing at cold start). e2e pins it to `warn` in `test/setup-env.ts`.

## Don'ts

- **Don't unpin or bump `sanitize-html`.** `2.17.5` is exact for a reason: ≥ 2.17.6 pulls ESM-only `htmlparser2` v12, and AWS's managed `nodejs22.x` is built without `require(esm)`. Local Node 22.12+ and GitHub Actions both *do* support it, so every check stayed green while production returned 502 on every route — twice. `.github/dependabot.yml` ignores it at every level. Full write-up: `ARCHITECTURE.md` §15, Incident #4.
- **Don't add a runtime dependency without running `npm run check:cjs`.** It is the only check that catches the failure above; Jest cannot, because `transformIgnorePatterns` downlevels ESM-only files to CJS.
- Don't run `nest start` in prod — `lambda.ts` is the entry, `main.ts` is local-only.
- Don't hand-edit `dist/` — wiped on every `nest build` (`deleteOutDir: true`). Don't import from it either.
- Don't add a global guard. Per-route `@UseGuards` is the established pattern and several endpoints are intentionally anonymous (list above).
- Don't bypass `SanitizeHtmlPipe` on the five routes that carry it. The frontend `DomSanitizer` is not enough — a compromised manager account could `curl` directly.
- Don't widen IAM, CORS or the CSP as a convenience. Each is documented with a rationale in `../docs/MEDIA-UPLOADS.md` and `../infra/SECURITY-HEADERS.md`.
