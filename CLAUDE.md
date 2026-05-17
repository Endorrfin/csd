# CLAUDE.md — CSD Fund (root)

Guidance for Claude when working anywhere in this repo. Per-app rules live in `backend/CLAUDE.md` and `ui/CLAUDE.md`; read the relevant one before editing that app.

## What this project is

Web portal for the Charitable Fund **"Centre for Support and Development"** (WASH recovery, reconstruction, shelter support in Ukraine). Production: <https://www.csd-fund.org>. Two deployable apps in a monorepo, both deployed to AWS (`eu-central-1`).

```
csd-fund/
├── backend/                       # NestJS 11 REST API   → Lambda + API Gateway + RDS
├── ui/                            # Angular 21 SSR app   → Lambda + S3 + CloudFront
├── docs/ARCHITECTURE.md           # Long-form architecture & runbook (treat as reference, may drift — see below)
├── .github/workflows/deploy.yml   # CI/CD pipeline for both apps
└── .prettierrc / .prettierignore  # Shared formatter config
```

## Tech stack snapshot

| Layer        | Backend                                  | Frontend                                       |
| ------------ | ---------------------------------------- | ---------------------------------------------- |
| Language     | TypeScript 5.7 (Node 22)                 | TypeScript 5.9 (Node 22)                       |
| Framework    | NestJS 11                                | Angular 21 standalone + signals + SSR          |
| HTTP entry   | `backend/lambda.ts` (serverless-express) | `ui/lambda.mjs` (serverless-http) + `ui/src/server.ts` |
| Persistence  | TypeORM 0.3 + PostgreSQL 16 (RDS in prod) | localStorage for JWT (browser only)            |
| Auth         | Passport JWT (`@nestjs/passport`)        | JWT in `localStorage`, `authInterceptor`       |
| Test runner  | Jest 30                                  | Vitest 4 (`ng test`)                           |
| Linter       | ESLint 9 + typescript-eslint             | ESLint 10 + angular-eslint + typescript-eslint |
| Formatter    | Prettier 3 (shared `.prettierrc`)        | Prettier 3 (shared `.prettierrc`)              |
| Deploy tool  | Serverless Framework v4                  | Serverless Framework v4 + `aws s3 sync`        |

## Common commands

There is no top-level `package.json`. Run commands inside each app directory.

```bash
# Backend (run from /backend)
npm install
npm run start:dev               # http://localhost:3000  (API mounted at /api)
npm run migration:run           # apply pending TypeORM migrations
npm run lint && npm run test    # before any commit

# Frontend (run from /ui)
npm install
npm start                       # http://localhost:4200 → talks to backend at :3000
npm run build                   # production build (SSR, outputMode=server)
npm run lint && npm test        # before any commit
```

## Deployment (the one that actually runs)

`.github/workflows/deploy.yml` is the source of truth. It triggers on:
- PR merge to `main` (closed + `merged == true`), or
- manual `workflow_dispatch` (cancels in-flight PR-merge runs in its concurrency group).

Pipeline order: install → `migration:show` → conditional `migration:run` → `nest build` → `serverless deploy --stage prod` → `/api/health` smoke test → then frontend job (depends on backend success) → `ng build` → S3 sync (hashed assets long-cache, HTML no-cache) → SSR Lambda deploy → CloudFront invalidate `/*` → smoke test (`<app-root>` presence).

Production resources (eu-central-1):
- Backend Lambda: `csd-api-prod-api` · CloudFormation stack `csd-api-prod`
- SSR Lambda: `csd-ssr-prod-ssr` · CloudFormation stack `csd-ssr-prod`
- S3 static: `csd-fund-static` · Media: `csd-media`
- CloudFront distribution: `E3U465AMSVR9PN`
- RDS: `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com` (PG 16)
- Backend API URL (direct): `https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod`

CODEOWNERS: `@Kirnadz` is the default reviewer for everything.

## Repo-wide conventions

- Formatting: shared `.prettierrc` at root (semi, single-quote, trailing comma all, 100 col, 2-space). Run `npm run format` in the changed app.
- File language: code, comments, commit messages — **English**. UI copy and i18n files (`ui/src/assets/i18n/{ua,en}.json`) are bilingual.
- Mark every non-trivial edit with `// CHANGED:` or `// === ADDED: … ===` so diffs are easy to review (existing convention used across the codebase, e.g. `deploy.yml`, `auth.controller.ts`, `lambda.mjs`).
- Never commit secrets. `.env*` (except `.env.example`) is git-ignored. Real secrets live in GitHub Secrets and Lambda env vars set by Serverless.
- `package-lock.json` is committed and consumed by `npm ci` in CI — do not delete or regenerate without a reason.

## How Claude should work in this repo (Vasyl's rules)

These override generic Claude defaults. They apply everywhere in the repo.

1. No generic answers — propose a concrete solution tied to this project and stack.
2. Skip lengthy explanations unless asked; explain *why* in 1–2 sentences.
3. Before changing files, briefly state what will change and why, then implement.
4. Mark every edit with `// CHANGED:` (or `// === ADDED: ===` for inserted blocks).
5. Respect the linters (`backend/eslint.config.mjs`, `ui/eslint.config.mjs`) and `.prettierrc` — do not introduce code that will fail `npm run lint`.
6. Reliability, security and best practices come before convenience.
7. If something is unclear — ask. Don't guess at intent.
8. Push back when Vasyl is wrong or only partially right; ask clarifying questions and guide to the correct solution instead of agreeing.

## ⚠️ Doc drift warning

`README.md`, `backend/README.md`, `ui/README.md` and `docs/ARCHITECTURE.md` are partially stale. When they disagree with the code, **the code wins**. Concrete drift caught at last audit:

- Some controller paths in `README.md` are wrong vs. actual `@Controller()` decorators. Real paths (all under `/api`):
  - `complaints` (plural) — `README` says `/complaint`
  - `needs-forms` — `README` says `/needs`
  - `pages` — `README` says `/content`
  - `about` exists but `README` doesn't mention it
- `backend/lambda.ts` lives at `backend/lambda.ts` (repo root of the backend), **not** in `backend/src/`.
- `partners` route on the frontend is currently commented out in `ui/src/app/app.routes.ts` even though the feature folder exists.
- `backend/README.md` mentions Homebrew `postgresql@14` on port 5432; `backend/.env.example` actually defaults to `DB_PORT=5433` (different local setups in use).

When in doubt: open the actual `.ts`/`.yml`/`package.json`. Don't quote the docs as authoritative.

## Where to read next

- Backend specifics → [`backend/CLAUDE.md`](./backend/CLAUDE.md)
- Frontend specifics → [`ui/CLAUDE.md`](./ui/CLAUDE.md)
- Long-form architecture & runbooks → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) *(verify against code)*
- Active CI/CD pipeline → [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
