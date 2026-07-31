# CLAUDE.md — CSD Fund (root)

Guidance for Claude when working anywhere in this repo. Per-app rules live in `backend/CLAUDE.md` and `ui/CLAUDE.md`; read the relevant one before editing that app.

## What this project is

Web portal for the Charitable Fund **"Centre for Support and Development"** (WASH recovery, reconstruction, shelter support in Ukraine). Production: <https://www.csd-fund.org>. Two deployable apps in a monorepo, both deployed to AWS (`eu-central-1`).

```
csd-fund/
├── backend/                       # NestJS 11 REST API   → Lambda + API Gateway + RDS
├── ui/                            # Angular 21 SSR app   → Lambda + S3 + CloudFront
├── convertors/                    # Python CSV/XLSX → JSON converters (feed ui/src/assets/data/, run manually)
├── infra/                         # Hand-applied AWS config — CloudFront headers policy, S3 CORS JSON,
│                                  # SECURITY-HEADERS.md. NO pipeline touches this directory.
├── docs/
│   ├── ARCHITECTURE.md            # Long-form architecture, data model, feature catalogue, runbooks, incidents
│   ├── MEDIA-UPLOADS.md           # Operating the three S3 buckets and the four upload endpoints
│   ├── DOC-AUDIT.md               # Verified inventory + the settled documentation decisions (§5)
│   └── tasks/                     # doc-refresh-task.md, tasks.md (tracked; other docs/ subfolders are gitignored)
├── README.md                      # Entry point — stack, modules, local setup for macOS and Windows
├── CONTRIBUTING.md                # Branching, commits, PR process. §4 is the CANONICAL command reference
├── .github/workflows/
│   ├── test.yml                   # PR Checks — pre-merge, BACKEND ONLY
│   └── deploy.yml                 # Post-merge deploy for both apps
└── .prettierrc / .prettierignore  # Shared formatter config
```

Several `docs/` subfolders are **gitignored** (`forms/`, `about-documents/`, `screenshots/`, `audit/`) and others are simply **untracked but not ignored** (`Research/`, `pоlicies_and_procedures/`). Read any of them for intent, but never cite them from a tracked document — a reader cloning the repo will not have them. And don't `git add docs/` wholesale: the untracked-but-not-ignored ones would be swept into the commit.

## Tech stack snapshot

| Layer        | Backend                                  | Frontend                                       |
| ------------ | ---------------------------------------- | ---------------------------------------------- |
| Language     | TypeScript 5.7 (Node 22)                 | TypeScript 5.9 (Node 22)                       |
| Framework    | NestJS 11                                | Angular 21 standalone + signals + SSR          |
| HTTP entry   | `backend/lambda.ts` (serverless-express) | `ui/lambda.mjs` (serverless-http) + `ui/src/server.ts` |
| Persistence  | TypeORM 0.3 + PostgreSQL (see below)     | localStorage for JWT (browser only)            |
| Auth         | Passport JWT (`@nestjs/passport`)        | JWT in `localStorage`, `authInterceptor`       |
| Test runner  | Jest 30                                  | Vitest 4 (`ng test`)                           |
| Linter       | ESLint 9 + typescript-eslint             | ESLint 10 + angular-eslint + typescript-eslint |
| Formatter    | Prettier 3 (shared `.prettierrc`)        | Prettier 3 (shared `.prettierrc`)              |
| Deploy tool  | Serverless Framework v4                  | Serverless Framework v4 + `aws s3 sync`        |

**PostgreSQL runs at three different versions and this matters:** local dev **14** (Homebrew `postgresql@14`, port 5432) · backend e2e **`postgres:16-alpine`** (Testcontainers) · production **16.13** on RDS. Migrations are authored on 14 and applied to 16. See `README.md` §1 "Database" and `ARCHITECTURE.md` §13.

## Common commands

There is no top-level `package.json`. Run commands inside each app directory.

```bash
# Backend (run from /backend)
npm install
npm run start:dev               # http://localhost:3000  (API mounted at /api)
npm run migration:run           # apply pending TypeORM migrations
npm run verify                  # typecheck → lint:check → check:cjs → test → build

# Frontend (run from /ui)
npm install
npm start                       # http://localhost:4200 → talks to backend at :3000
npm run build                   # production build (SSR, outputMode=server)
npm run verify                  # typecheck → lint → format:check → test:ci → build
```

`npm run verify` is the gate, not `lint && test`. Two caveats that catch people out: the **backend's** `lint` carries `--fix` and rewrites your files (`lint:check` is the read-only one), while the **ui's** `lint` is plain `ng lint` with no `--fix`; and the ui's `format:check` covers **SCSS only**, so `verify` never format-checks `.ts` or `.html`. Full table: [`CONTRIBUTING.md` §4](./CONTRIBUTING.md#4-pre-commit-checklist) — the canonical reference.

## CI — and what it does not check

Two workflows. Neither of them ever runs `npm run verify`.

**`.github/workflows/test.yml` ("PR Checks")** — on `pull_request` → `main`. **It has exactly one job, `backend`; the entire `ui` app is ungated pre-merge.** The job runs `lint:check` → `check:cjs` → `test` → `test:e2e` (Testcontainers). It does **not** run backend `typecheck`, `format` or `build`, and it runs no frontend step at all — no `ng lint`, no `typecheck`, no `ng test`, no `ng build`. A green PR tells you nothing about the frontend.

**`.github/workflows/deploy.yml`** — the deploy. Triggers on PR merge to `main` (`closed` + `merged == true`) or manual `workflow_dispatch`. The concurrency group is `deploy-prod-${{ github.event_name }}`, i.e. **keyed on the event name**, so a `workflow_dispatch` run lands in a *different* group and cannot cancel a queued PR-merge run — the comment in the file claims otherwise.

Pipeline order: install → `check:cjs` → `migration:show` → conditional `migration:run` → `nest build` → `serverless deploy --stage prod` → `/api/health` smoke test → then the frontend job (depends on backend success) → `ng build` → S3 sync (hashed assets long-cache, HTML no-cache) → SSR Lambda deploy → CloudFront invalidate `/*` → frontend smoke test, which greps for **`ng-server-context`**, not `<app-root>` (the literal tag matched the CSR shell and would pass exactly when SSR broke).

Full detail: `ARCHITECTURE.md` §12.

## Production resources (eu-central-1)

- Backend Lambda: `csd-api-prod-api` · CloudFormation stack `csd-api-prod`
- SSR Lambda: `csd-ssr-prod-ssr` · CloudFormation stack `csd-ssr-prod`
- S3: `csd-fund-static` (static site) · `csd-media` (public media) · **`csd-media-private`** (needs-form attachments and About-registry PDFs — private, presigned POST in and presigned GET out; created by hand, not by Serverless)
- CloudFront distribution: `E3U465AMSVR9PN`
- RDS: `csd-postgres.cfgy4a0e2bo6.eu-central-1.rds.amazonaws.com` (PostgreSQL 16.13)
- Backend API URL (direct): `https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod`

Bucket details and the upload matrix: `ARCHITECTURE.md` §8.1 (what) · `docs/MEDIA-UPLOADS.md` (how). CloudFront header/CSP state — including the live policy ID — is in `infra/SECURITY-HEADERS.md` §0, where every live-AWS value carries a `†` and a re-check command. **Those values are not derivable from this repository; do not restate them as repo facts.**

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

## Documentation state

Every tracked document in this repo was re-verified against the code in a four-pass refresh completed **2026-07-31**. Each one now owns a distinct slice and links to the others rather than restating them.

| Document | Owns | Last verified against |
| --- | --- | --- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Data model, feature catalogue (§7), bucket/upload matrix (§8.1), env vars (§9), CI (§12), CSP **status** (§14.3), incidents (§15), runbooks (§16), debt (§17) | `1c1030f` |
| [`README.md`](./README.md) | Entry point — stack, module list, macOS/Windows setup, troubleshooting | `6d84d64` |
| [`backend/README.md`](./backend/README.md) | Backend setup, migrations, seeds, the `verify` chain, known gaps | `6d84d64` |
| [`ui/README.md`](./ui/README.md) | Render modes, npm scripts, testing reality, language rule, Leaflet-from-CDN, known debt | `6d84d64` |
| [`docs/MEDIA-UPLOADS.md`](./docs/MEDIA-UPLOADS.md) | Upload **operations** — bucket creation, CORS, IAM, error responses, retention/PII | `4ee8195` |
| [`infra/SECURITY-HEADERS.md`](./infra/SECURITY-HEADERS.md) | CSP **procedure** — allowlist rationale, apply/verify/enforce runbooks, live-AWS values (all `†`-marked) | `4ee8195` |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branching, commits, PR process, and **§4 — the canonical command reference** | `e5a4578` |
| `CLAUDE.md` ×3 (this file, `backend/`, `ui/`) | The rules an agent must not break | `e5a4578` |

The decisions behind that split — which document owns what, and what was settled rather than re-argued — are recorded in [`docs/DOC-AUDIT.md` §5](./docs/DOC-AUDIT.md). Read it before proposing that a document be restructured; several of the obvious "improvements" were considered and rejected there.

**None of this makes a document authoritative over the code.** When they disagree, open the actual `.ts`/`.yml`/`.json` and correct the document in the same change. Counts (routes, entities, spec files, modules) drift with every commit — re-derive them, don't copy them forward.

What will make this stale fastest: a new backend module, a new upload endpoint or bucket, a change to either workflow, applying or enforcing the CloudFront CSP policy, and the PR-D4 About-registry work (in-app PDF viewer, CSP, rate limit) which is designed but not shipped.

## Where to read next

- Backend specifics → [`backend/CLAUDE.md`](./backend/CLAUDE.md)
- Frontend specifics → [`ui/CLAUDE.md`](./ui/CLAUDE.md)
- Commands, branching, PR process → [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Long-form architecture & runbooks → [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- CI/CD → [`.github/workflows/test.yml`](./.github/workflows/test.yml) (pre-merge, backend only) · [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) (post-merge)
