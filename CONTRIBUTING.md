# Contributing to CSD Fund

> Ground rules for every developer working on this repository — interns, juniors, and seniors alike.
> When in doubt about something not covered here, ask the team lead before guessing.
>
> **Last verified against code:** 2026-07-31 (commit `e5a4578`). **§4 is the canonical command reference** for the repo — every other document keeps a day-to-day subset and links here. If you change a script in `backend/package.json` or `ui/package.json`, update §4 in the same commit.

---

## Table of contents

1. [Git workflow — branches](#1-git-workflow--branches)
2. [Git workflow — commits](#2-git-workflow--commits)
3. [Pull request process](#3-pull-request-process)
4. [Pre-commit checklist — canonical command reference](#4-pre-commit-checklist)
5. [Testing](#5-testing)
6. [Code style](#6-code-style)
7. [Angular conventions (ui/)](#7-angular-conventions-ui)
8. [NestJS conventions (backend/)](#8-nestjs-conventions-backend)
9. [Security rules](#9-security-rules)
10. [Common mistakes to avoid](#10-common-mistakes-to-avoid)

---

## 1. Git workflow — branches

### Format

```
<type>/<short-description>
```

- Use **kebab-case**, all lowercase, no spaces or underscores.
- Keep it under **50 characters**.
- Be specific — avoid vague names like `fix/bug` or `feat/update`.

### Branch types

| Type | When to use |
| --- | --- |
| `feat/` | New feature or new UI component |
| `fix/` | Bug fix |
| `docs/` | Documentation only (README, CONTRIBUTING, task files) |
| `refactor/` | Code change that doesn't add a feature or fix a bug |
| `test/` | Adding or fixing tests only |
| `chore/` | Dependency updates, config changes, tooling |
| `perf/` | Performance improvement |
| `hotfix/` | Urgent production fix — branch off `main` directly |

### Examples

```bash
feat/wash-form-progress-bar
feat/blog-search
fix/login-401-error-message
fix/header-mobile-menu-esc-key
docs/local-dev-setup-windows
refactor/auth-service-to-signals
test/location-service-unit-tests
chore/angular-21-upgrade
perf/blog-lazy-load-images
hotfix/wash-form-submit-crash
```

### Rules

- **Never commit directly to `main`.** All changes go through a branch + PR.
- One branch = one concern. Don't mix a feature with unrelated fixes.
- Delete your branch after the PR is merged.
- Branch off the latest `main` before starting work:
  ```bash
  git checkout main && git pull origin main
  git checkout -b feat/your-feature-name
  ```

---

## 2. Git workflow — commits

This project follows **[Conventional Commits](https://www.conventionalcommits.org/)**.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
| --- | --- |
| `feat` | New feature visible to the user |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructuring without feature or bug change |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, config |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes (`.github/workflows/`) |

### Scopes (optional but recommended)

Use the feature or module name: `auth`, `blog`, `wash-form`, `admin`, `vacancy`, `header`, `footer`, `i18n`, `api`, `migrations`, `deps`.

### Subject line rules

- **Imperative mood** — write as a command: `add`, `fix`, `update`, `remove` (not `added`, `fixes`, `updated`)
- **No capital letter** at the start (after the colon)
- **No period** at the end
- **Max 72 characters**

### Examples

```bash
# ✅ Good
feat(blog): add reading time pipe
fix(login): show form-level error on 401 response
docs(readme): add windows local dev setup section
refactor(auth): convert class-based state to signals
test(location): add unit tests for getLocations()
chore(ui): update @angular/core to 21.3.0
perf(blog): add loading="lazy" to post cover images
ci: add smoke test for /api/health after deploy

# ❌ Bad
Fixed bug                          # no type, no scope, past tense
feat: updated some stuff           # vague, past tense
feat(blog): Add reading time.      # capital letter, period
WIP                                # not a real commit
```

### Commit body (when to use it)

Add a body when the **why** is not obvious from the subject line:

```
fix(wash-form): prevent negative values in pump count

Validators.min(0) was missing on numeric fields.
Negative values were silently accepted and caused
a 400 error from the API on submit.
```

### Marking code changes in files

Every non-trivial edit must be marked inline so diffs are easy to review:

```typescript
// CHANGED: added Validators.min(0) to prevent negative pump count
pumpCount: [0, [Validators.required, Validators.min(0)]],
```

```typescript
// === ADDED: reading time computed signal ===
readonly readingTime = computed(() =>
  Math.ceil((this.post()?.content?.split(' ').length ?? 0) / 200)
);
// === END ADDED ===
```

---

## 3. Pull request process

### Before opening a PR

- [ ] Your branch is up to date with `main` (`git pull origin main --rebase`)
- [ ] `npm run verify` passes in the changed app directory (see §4 — this is the gate; `lint && test` is not)
- [ ] No `console.log` statements in committed code
- [ ] New translation keys added to **both** `ua.json` and `en.json`
- [ ] New browser-only code has an `isPlatformBrowser` check
- [ ] If you touched `ui/` only: you ran the checks yourself — **CI runs no frontend job on a PR** (§5)
- [ ] If you added a runtime dependency to `backend/`: `npm run check:cjs` passes (§6)
- [ ] If you changed an npm script: §4 of this file updated in the same commit

### PR title

Follow the same convention as commit messages:

```
feat(blog): add search with debounce
fix(admin): fix bulk status update for wash forms
docs: add CONTRIBUTING.md
```

### PR description template

```markdown
## What
Short description of what changed.

## Why
Why this change was needed.

## How to test
1. Go to /cooperation/vacancy
2. Type in the search box
3. Verify results filter after 400ms (not on every keystroke)

## Screenshots (if UI change)
```

### Review

- Default reviewer is **@Kirnadz** (see `CODEOWNERS`).
- Address all review comments before merging.
- Prefer **Squash and merge** for feature branches to keep `main` history clean.
- Delete the branch after merge.

---

## 4. Pre-commit checklist

**This section is the canonical command reference for the repository.** Other
documents keep a day-to-day subset and link here. Every entry below was
re-derived from `backend/package.json` and `ui/package.json`; if you change a
script, change this section in the same commit.

**Nothing enforces any of this on your machine.** There is no husky, no
lint-staged, no pre-commit hook anywhere in the repo. Running these is a habit,
not a gate.

### The one command a PR should pass

```bash
# ui/
npm run verify        # typecheck → lint → format:check → test:ci → build

# backend/
npm run verify        # typecheck → lint:check → check:cjs → test → build
```

### Backend (`cd backend`)

| Script | Runs | Notes |
| --- | --- | --- |
| **`verify`** | **`typecheck` → `lint:check` → `check:cjs` → `test` → `build`** | the pre-push gate. Note it uses `lint:check`, **not** `lint` |
| `typecheck` | `tsc --noEmit -p tsconfig.json` | in `verify` |
| `lint:check` | `eslint "{src,apps,libs,test}/**/*.ts" lambda.ts` | in `verify`. Read-only — this is what `test.yml` runs |
| `check:cjs` | `node --no-experimental-require-module scripts/check-cjs-load.cjs` | in `verify`. `require()`s every runtime dependency — see §6 "Dependencies" |
| `test` | `jest` | in `verify`. 17 unit suites under `src/` |
| `build` | `nest build` | in `verify` |
| `lint` | same as `lint:check` **plus `--fix`** | *not* in `verify` — it rewrites your files. Never use it in CI |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | **write-only — there is no `format:check` in this app** |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | **needs Docker.** Not part of `verify` |
| `test:cov` / `test:watch` / `test:debug` | Jest variants | |
| `migration:{generate,run,revert,show}` | TypeORM CLI via the internal `typeorm` script, with `-d src/database/data-source.ts` already passed | see §8. Don't call `typeorm` directly |
| `seed:super-admin` | `src/database/seed-super-admin.ts` | standalone; not in the bootstrap chain |
| `seed:about-documents` | `src/database/seed-about-documents-standalone.ts` | the **only** way production gets the About registry |
| `verify:prod-baseline` | read-only diff of the baseline migration vs. the prod schema | manual; no workflow runs it |
| `start` / `start:dev` / `start:debug` | `nest start` variants | local dev |
| `start:prod` | `node dist/main` | runs the compiled **local** bootstrap. Production does not use it — Lambda's entry is `dist/lambda.handler` |

There is **no `seed:equipment` script.** The equipment catalogue is seeded by
`runSeeds()` on local boot, together with the About registry.

### Frontend (`cd ui`)

| Script | Runs | Notes |
| --- | --- | --- |
| **`verify`** | **`typecheck` → `lint` → `format:check` → `test:ci` → `build`** | the pre-push gate. Note it uses `lint` here — the ui's `lint` does not mutate |
| `typecheck` | `ngc -p tsconfig.app.json --noEmit` | in `verify`. Strict templates |
| `lint` | `ng lint` | in `verify`. **No `--fix`** — unlike the backend, this does not touch your files |
| `format:check` | `prettier --check "src/**/*.scss"` | in `verify`. ⚠ **SCSS only** — `verify` never format-checks `.ts` or `.html` |
| `test:ci` | `ng test --no-watch` | in `verify`. Identical command to `test` |
| `build` | `ng build` | in `verify`. Production config by default |
| `lint:fix` | `ng lint --fix` | *not* in `verify` — the one that rewrites |
| `format` | `prettier --write "src/**/*.{ts,html,scss}"` | *not* in `verify` — rewrites all three extensions |
| `test` | `ng test --no-watch` | **2 spec files exist** — see §5 |
| `test:watch` | `ng test` | interactive watcher |
| `e2e` | `playwright test` | *not* in `verify`. Builds and serves the app itself — **stop your local backend first**, the stub API binds `:3000` |
| `e2e:ui` / `e2e:report` | `playwright test --ui` / `playwright show-report` | interactive runner / last HTML report |
| `typecheck:e2e` | `tsc -p e2e/tsconfig.json --noEmit` | *not* in `verify`. The only thing that type-checks a spec — `typecheck` covers `src/` only |
| `build:e2e` | `ng build --configuration development` | what `playwright.config.ts` builds with. **Never plain `ng build` for e2e** — production `fileReplacements` point the app at the live API |
| `watch` | `ng build --watch --configuration development` | |
| `serve:ssr:ui` | `node dist/ui/server/server.mjs` | run the built SSR bundle locally |
| `start` / `ng` | `ng serve` / `ng` | |

### Notes that keep biting people

- **`verify` ends with `build` on purpose.** `tsc`/`ngc --noEmit` will not catch
  a bundling or budget failure, and a broken `ng build` is exactly what breaks
  the deploy workflow.
- **Backend `lint` mutates, ui `lint` does not.** The backend's carries `--fix`;
  the ui's is plain `ng lint`. Do not generalise the backend caveat to both apps.
- **`format:check` in `ui/` is SCSS-only**, so `npm run verify` passes on a
  Prettier-dirty `.ts` file. Run `npm run format` before you push.
- **The backend has no `format:check` at all**, so nothing anywhere verifies
  backend formatting — `format` is write-only.
- **CI never invokes `verify` by name**, but `test.yml` now runs each app's chain
  step by step across three jobs, plus Playwright. Running `verify` locally and
  getting a green PR are close to the same thing — the gaps are formatting of
  `.ts`/`.html` and everything the stub API cannot exercise. See §5 and
  `docs/ARCHITECTURE.md` §12.
- **Backend e2e is not part of `verify`** — it needs Docker for Testcontainers.
  Run it separately when you touch entities or migrations.
- **Playwright is not part of `verify` either.** It builds the app and starts two
  servers, which is too slow for a pre-commit gate; the `e2e` job in `test.yml`
  is what enforces it.

---

## 5. Testing

### What CI actually gates

`.github/workflows/test.yml` ("PR Checks") runs on every pull request against
`main`. **It has three parallel jobs — `backend`, `ui` and `e2e`** — and no
`paths:` filters, so all three run on every PR.

| | Backend | Frontend |
| --- | --- | --- |
| Pre-merge (`test.yml`) | `typecheck` · `lint:check` · `check:cjs` · `test` · `build` · `test:e2e` | `typecheck` · `lint` · `format:check` · `test:ci` · `build`, plus `typecheck:e2e` · Playwright in the `e2e` job |
| Post-merge (`deploy.yml`) | `check:cjs` · migrations · `nest build` · deploy · `/api/health` smoke test | `ng build` · S3 sync · SSR deploy · CloudFront invalidate · smoke test |

So: **not running lint before pushing blocks a PR in either app.** What a green
check still does not prove: `.ts`/`.html` formatting is checked nowhere (`ui`'s
`format:check` is SCSS-only, the backend has no formatting step), `ui` has two
unit specs, and the Playwright suite runs against a stub API — uploads, admin
auth and CRUD are unexercised. Full detail in `docs/ARCHITECTURE.md` §12.

### Frontend — `ui/` (Vitest 4)

```bash
cd ui
npm test              # run all specs once (ng test --no-watch)
npm run test:watch    # interactive watcher
npm run test:ci       # identical command to `npm test`
```

⚠ **There are exactly two spec files in the whole app** — `src/app/app.spec.ts`
and `src/app/features/contact/inquiry-form.spec.ts`. There is no
`vitest.config.ts` and no options block on `angular.json`'s test target. A green
`npm test` is close to meaningless today, so treat every new spec as a net gain
rather than as satisfying an existing bar.

**Where tests live:** colocated with source as `*.spec.ts`, next to the file
under test.

**What to test:**

| ✅ Test these | ❌ Skip these |
| --- | --- |
| Services (signal state, computed values) | Simple template rendering |
| Pipes (`QuillHtmlPipe` — the only pipe in the app) | Dumb presentational components |
| Guards (`authGuard`, `managerGuard`, `adminGuard`, `superAdminGuard` — return value per role/platform) | Angular built-in mechanics |
| Directives (`FadeInOnScrollDirective` — DOM mutations, class toggling) | One-line getters/setters |
| Resolvers (success path + 404 redirect) | |

**Naming:** `describe('AuthService')` → `it('should return false for isLoggedIn() on init')`.

**SSR tests:** mock `PLATFORM_ID` to test both browser and server paths when `isPlatformBrowser` is used.

**Do not reintroduce Karma/Jasmine.** The stack is Vitest. If you see `karma.conf.js` — delete it.

### Backend — `backend/` (Jest 30)

```bash
cd backend
npm test              # 17 unit suites under src/
npm run test:e2e      # 1 e2e suite under test/ — needs Docker
npm run test:cov      # coverage report
```

**E2e tests** start a `postgres:16-alpine` container via Testcontainers and run
every migration before the suite, with `maxWorkers: 1`. **Docker must be running
or the run fails**, which is why `test:e2e` is not part of `verify`. Never mock
the database in e2e tests — that's how prod divergence happens.

Note the PostgreSQL spread while you read failures: **local dev is 14**, **e2e
is 16-alpine**, **production is 16.13**. A migration that passes locally has
been exercised on 14 only; `npm run test:e2e` is the cheapest way to see it on
16 before it reaches RDS.

**Unit tests:** mock TypeORM repositories with `jest.fn()`. Do not use `synchronize: true` even in tests.

---

## 6. Code style

### Formatting

Shared `.prettierrc` at the repo root applies to both apps:
- 2-space indent, single quotes, trailing commas, 100-column lines, semicolons.

```bash
# Format before committing:
npm run format      # inside ui/ or backend/
```

### Language

- **Code, comments, commit messages, PR descriptions:** English.
- **UI copy and i18n files** (`ui/src/assets/i18n/{ua,en}.json`): bilingual (Ukrainian + English).

### No `console.log` in committed code

Use `// TODO: remove` or a logger service instead. CI does not block on this, but reviewers will flag it.

### Dependencies — the rule that came from two outages

**Adding a runtime dependency to `backend/` requires `npm run check:cjs` to
pass.** AWS's managed `nodejs22.x` runtime is built **without** `require(esm)`
support and it cannot be re-enabled via `NODE_OPTIONS` — but plain Node 22.12+
locally and on GitHub Actions *does* support it. So an ESM-only transitive
dependency passes every check and takes production down with a 502 on every
route. Jest cannot catch it either: `transformIgnorePatterns` downlevels those
files to CJS. This has happened twice —
[`docs/ARCHITECTURE.md` §15, Incidents #2 and #4](./docs/ARCHITECTURE.md#15-known-incidents-timeline).

Consequences you must respect:

- `sanitize-html` is **pinned exact at `2.17.5`**. Do not unpin or bump it;
  ≥ 2.17.6 pulls ESM-only `htmlparser2` v12.
- `.github/dependabot.yml` ignores `sanitize-html` at every level and ignores
  **all npm majors** for both apps. That is deliberate, not neglect.
- `npm run check:cjs` runs in `test.yml` pre-merge *and* in `deploy.yml`
  **before** the migration steps, so a build known not to boot never mutates
  production RDS. Don't reorder those steps.

### Marking changes

Every non-trivial edit must be marked so diff review is easy:

```typescript
// CHANGED: reason for the change
```

```typescript
// === ADDED: description ===
// new code here
// === END ADDED ===
```

---

## 7. Angular conventions (`ui/`)

### Standalone only

No `NgModule` anywhere. All components, directives, and pipes are `standalone: true` (the default in Angular 21). Import dependencies directly on the component.

```typescript
// ✅
@Component({ standalone: true, imports: [CommonModule, RouterLink] })

// ❌ never
@NgModule({ declarations: [MyComponent] })
```

### Signals over RxJS for local state

Use `signal()`, `computed()`, and `effect()` for component and service state. Use RxJS only for HTTP streams and event composition.

```typescript
// ✅
readonly isLoading = signal(false);
readonly count = computed(() => this.items().length);

// ❌ avoid for local state
isLoading$ = new BehaviorSubject(false);
```

### `inject()` not constructor DI

```typescript
// ✅
private readonly api = inject(ApiService);

// ❌
constructor(private api: ApiService) {}
```

### Lazy-load every feature

```typescript
// ✅
{ path: 'blog', loadComponent: () => import('./features/blog/blog').then(m => m.BlogComponent) }

// ❌ never import eagerly in routes
import { BlogComponent } from './features/blog/blog';
```

### SSR safety — browser-only APIs

Any code that uses `localStorage`, `window`, `document`, `navigator`, or `IntersectionObserver` must be guarded:

```typescript
private readonly platformId = inject(PLATFORM_ID);

if (isPlatformBrowser(this.platformId)) {
  localStorage.setItem('key', value);
}
```

`auth.interceptor.ts` and `core/guards/auth.guard.ts` do this correctly — use
them as the reference. **Five committed components do not**, and they are not a
precedent: `admin/{complaints,inquiries,recovery-forms-list,wash-forms-list,winterization-forms-list}`
each call `localStorage.getItem('token')` unguarded, to attach a bearer token to
a raw export `fetch`. They work only because those calls are user-triggered
after hydration. Tracked as debt in `ui/README.md`; guard them if you touch them.

### Language-dependent logic — use `LanguageService`

The app is **zoneless** (no `zone.js` in polyfills), so `translate.currentLang`
is not reactive — reading it subscribes to nothing and re-renders only by
accident. Inject `LanguageService` and read `lang()` / `isUa()` instead.

```typescript
// ✅
private readonly language = inject(LanguageService);
readonly title = computed(() => this.language.isUa() ? this.item().titleUa : this.item().titleEn);

// ❌ intermittently stale under zoneless change detection
get title() { return this.translate.currentLang === 'ua' ? ... : ...; }
```

Roughly 35 files still read `translate.currentLang` directly, so **copying a
neighbouring component reproduces the bug.** Copy from a `LanguageService`
consumer.

### Translations

Always add new keys to **both** `ua.json` and `en.json`. Use `| translate` in templates; `TranslateService` for imperative use.

```html
<!-- ✅ -->
<span>{{ 'COMMON.LOADING' | translate }}</span>

<!-- ❌ hardcoded -->
<span>Завантаження...</span>
```

### Selector prefix

All selectors must be prefixed `app-` (components) and `app` (directives), kebab-case for components, camelCase for directives. ESLint enforces this.

### Object shapes

Use `interface`, not `type`, for object shapes. `typescript-eslint` is configured to error on `type` aliases for objects.

```typescript
// ✅
interface User { id: string; email: string; }

// ❌
type User = { id: string; email: string; };
```

### HTTP calls go through `ApiService`

`ApiService` prepends `environment.apiUrl + '/api'`, and the interceptor adds the
bearer token. Don't use `HttpClient` directly in components.

```typescript
// ✅
this.api.get<Post[]>('blog')

// ❌
this.http.get('http://localhost:3000/api/blog')
```

Two deliberate exceptions already exist, both using raw `fetch`: **XLSX/CSV
downloads** in the five admin list components (`ApiService` returns JSON-typed
`Observable`s and cannot stream a blob) and **direct-to-S3 presigned uploads**
(which must *not* carry the `Authorization` header and don't target the API host
at all). If you add a third category, say why in the file.

---

## 8. NestJS conventions (`backend/`)

### Migrations — non-negotiable rules

- **Never edit a migration after it has been applied** to any environment (local, RDS). Write a new one — the `migrations` table records the timestamp as executed and `migration:run` will silently skip the edited file forever.
- **Never set `synchronize: true`** — hardcoded `false` in both `app.module.ts` and `data-source.ts`.
- One migration = one concern.
- Run `npm run migration:show` before and after `npm run migration:run` to verify.
- **You author on PostgreSQL 14 and it runs on 16.13.** Avoid syntax only one accepts, and prefer `npm run test:e2e` (16-alpine) over local-only confidence.

```bash
# Generate:
npm run migration:generate -- src/database/migrations/AddBlogCoverImage

# Run:
npm run migration:run

# Revert last:
npm run migration:revert
```

### DTOs and validation

Every controller method that accepts a body takes a DTO class with
`class-validator` decorators. The global `ValidationPipe` runs with
`{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — **the same
options in `main.ts` and in `lambda.ts`**, so an unexpected body field returns
**400 in every environment**. The old prod/local asymmetry is gone; if you touch
one pipe config, change both in the same commit.

One endpoint is outside this: `POST /api/upload/presigned-url` takes an inline
body type rather than a DTO, so `ValidationPipe` never runs on it and a bad MIME
surfaces as a **500**. Giving it a DTO changes that behaviour — call it out in
the PR.

### HTML sanitization

Apply `SanitizeHtmlPipe` to any DTO field that accepts Quill HTML output. The
allowed-tags whitelist in `sanitize-html.pipe.ts` must stay in sync with
`ui/src/app/shared/config/quill.config.ts`.

Know what is and is not covered before you assume: the pipe is applied to
**five routes** (procurement create/update, vacancy create/update/publish). About
sections are sanitized by a **separate config inside `about.service.ts`**. Blog
and `/api/pages` are **not sanitized server-side at all** — a documented
trade-off, not an oversight (`docs/ARCHITECTURE.md` §14.2).

### Route guards

Use per-route `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`. Do not add
a global guard — several endpoints are intentionally anonymous:

`POST /api/auth/{register,login,forgot-password,reset-password}` ·
`POST /api/needs-forms/wash` · `POST /api/complaints` ·
`POST /api/testimonials` · `POST /api/inquiries` ·
`POST /api/upload/testimonial-presigned`

Three further public routes carry `TurnstileGuard` instead —
`POST /api/needs-forms/recovery`, `POST /api/needs-forms/winterization`,
`POST /api/upload/needs-presigned`. The token travels in the
**`x-turnstile-token` header**, never the body (a body field would be rejected by
`forbidNonWhitelisted`).

⚠ **`RolesGuard` returns `true` when `@Roles()` is absent or empty.**
`@UseGuards(RolesGuard)` on its own is a silent no-op, not a lock. Always pair
them. `super_admin` also bypasses every role check by design.

### No `nest start` in production

`lambda.ts` is the Lambda entry point. `main.ts` is for local development only. Do not mix them.

---

## 9. Security rules

| Rule | Why |
| --- | --- |
| Never commit `.env` or any file with real secrets | Secrets are in GitHub Secrets + Lambda env vars |
| Never use `*` as a CORS origin | The allowlist is parsed from `FRONTEND_URL` by the shared `common/frontend-urls.ts`, used by **both** entry points — not by `main.ts` alone. In production `assertRequiredEnv()` refuses to boot on an empty or non-HTTPS value |
| Always sanitize Quill HTML server-side where the pipe is applied | A compromised manager account can `curl` directly |
| Don't widen the S3 IAM policy | It currently grants `PutObject` on `csd-media/*` and `PutObject` + `GetObject` on `csd-media-private/*`. There is deliberately **no `DeleteObject`** anywhere — adding it is a security decision, not a cleanup |
| Don't widen the CloudFront CSP as a convenience | Each allowlist entry has a recorded reason in `infra/SECURITY-HEADERS.md` §2.1 |
| Keep `DB_PORT` and `DB_PASSWORD` out of version control | Use `.env.example` for templates only |
| Rotate `JWT_SECRET` if it leaks — min 32 characters | `assertRequiredEnv()` throws at boot if it is missing or shorter |
| Don't flip `WINTERIZATION_HOUSEHOLD_ENABLED` | It gates direct assistance to individuals, which triggers Ukrainian tax-reporting duties and collects vulnerability data with no agreed retention period. A management decision, not a code one — rationale in `backend/.env.example` |

---

## 10. Common mistakes to avoid

| Mistake | Correct approach |
| --- | --- |
| Committing directly to `main` | Always use a branch + PR |
| Hardcoding `http://localhost:3000` anywhere | Use `environment.apiUrl` via `ApiService` |
| Adding `localStorage` without `isPlatformBrowser` | SSR crashes silently in production |
| Reading `translate.currentLang` in new code | Inject `LanguageService` — the app is zoneless and `currentLang` is not reactive (§7) |
| Editing an already-applied migration | Write a new migration file |
| Adding `NgModule` | Project is fully standalone — no modules |
| Using `type` for object shapes | Use `interface` (ESLint error) |
| Adding a translation key to only one language file | Always update both `ua.json` and `en.json` |
| Leaving `console.log` in code | Remove before committing |
| Not running lint before pushing | Blocks the PR in **either** app — `test.yml` runs `lint:check` in `backend` and `ng lint` in `ui` (§5) |
| Assuming a green PR check means the frontend is tested | It means it typechecks, lints and builds. `ui` has two unit specs and the Playwright suite runs against a stub API (§5) |
| Mocking the API with `page.route()` in a Playwright spec | The first paint is rendered in Node and transferred to the browser — the mock never fires. Use the stub in `ui/e2e/stub-api` (`ui/CLAUDE.md`) |
| `import`ing Leaflet in `ui/` | It is not an npm dependency — it comes from the unpkg CDN via `index.html`. Types only (`ui/CLAUDE.md`) |
| Bumping or unpinning `sanitize-html` | Pinned at `2.17.5`; newer versions took production down twice (§6) |
| Using `synchronize: true` in TypeORM config | Will destroy production schema on deploy |
| Importing route components eagerly | Always use `loadComponent` / `loadChildren` |
| Bypassing `ApiService` for HTTP calls | Interceptor and base URL stay centralized — except blob downloads and presigned S3 uploads (§7) |

---

## GitHub Issues (getting started)

Issues are GitHub's built-in task tracker — no external tool needed.

**Setup (one-time, repo owner):**

1. Go to **Settings → Features** and make sure **Issues** is enabled.
2. Go to **Issues → Labels** and create labels that match your workflow, for example:

   | Label | Color | Use for |
   | --- | --- | --- |
   | `bug` | red | Something is broken |
   | `feat` | blue | New feature request |
   | `docs` | grey | Documentation change |
   | `good first issue` | green | Suitable for interns/juniors |
   | `blocked` | orange | Waiting on something external |

3. Optionally create **Issue Templates** (`.github/ISSUE_TEMPLATE/`) — one for bugs, one for features.

**Day-to-day use:**

- Create an issue for every task before starting work.
- Reference the issue number in your branch name and commit:
  ```bash
  # Branch
  feat/42-blog-search

  # Commit
  feat(blog): add search with debounce (#42)
  ```
- Close issues automatically from commits or PR descriptions:
  ```
  Closes #42
  ```
- GitHub will link the commit/PR to the issue and close it on merge.

The 150 tasks in `docs/tasks/tasks.md` are a good starting point — they can be created as GitHub Issues in bulk using the GitHub CLI:

```bash
# Install GitHub CLI: https://cli.github.com
gh issue create --title "feat: add reading time pipe" --label "feat,good first issue"
```
