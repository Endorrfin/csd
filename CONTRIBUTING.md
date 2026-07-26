# Contributing to CSD Fund

> Ground rules for every developer working on this repository — interns, juniors, and seniors alike.
> When in doubt about something not covered here, ask the team lead before guessing.

---

## Table of contents

1. [Git workflow — branches](#1-git-workflow--branches)
2. [Git workflow — commits](#2-git-workflow--commits)
3. [Pull request process](#3-pull-request-process)
4. [Pre-commit checklist](#4-pre-commit-checklist)
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
- [ ] `npm run lint` passes in the changed app directory
- [ ] `npm test` passes in the changed app directory
- [ ] No `console.log` statements in committed code
- [ ] New translation keys added to **both** `ua.json` and `en.json`
- [ ] New browser-only code has `isPlatformBrowser` check

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

Run these from inside the changed app's directory before every commit:

```bash
# Frontend (ui/)
npm run lint          # must pass with 0 errors
npm test              # must pass
npm run format        # auto-formats — commit the result

# Backend (backend/)
npm run lint          # must pass with 0 errors
npm test              # must pass
npm run format        # auto-formats — commit the result
```

A quick combined check — **this is the one command a PR must pass**:

```bash
# ui/
npm run verify        # typecheck (ngc, strictTemplates) + lint + format:check + test + build

# backend/
npm run verify        # typecheck + lint:check + test + build
```

Notes:

- `verify` ends with `build` on purpose: `tsc`/`ngc --noEmit` will not catch a
  bundling or budget failure, and a broken `ng build` is exactly what breaks the
  deploy workflow.
- Backend `verify` uses `lint:check` (no `--fix`), so it *reports* violations
  instead of silently rewriting your files mid-check. `npm run lint` still fixes.
- `npm test` in `ui/` runs once (`ng test --no-watch`); use `npm run test:watch`
  for the interactive watcher.
- Backend e2e (`npm run test:e2e`) is **not** part of `verify` — it needs Docker
  for Testcontainers. Run it separately when you touch entities or migrations.

---

## 5. Testing

### Frontend — `ui/` (Vitest 4)

```bash
cd ui
npm test              # run all specs once (ng test --no-watch)
npm run test:watch    # interactive watcher
npm run test:ci       # CI alias of `npm test`
```

**Where tests live:** colocated with source as `*.spec.ts` (e.g., `auth.service.spec.ts` next to `auth.service.ts`).

**What to test:**

| ✅ Test these | ❌ Skip these |
| --- | --- |
| Services (signal state, computed values) | Simple template rendering |
| Pipes (`ReadingTimePipe`, `QuillHtmlPipe`) | Dumb presentational components |
| Guards (return value per role/platform) | Angular built-in mechanics |
| Directives (DOM mutations, class toggling) | One-line getters/setters |
| Resolvers (success path + 404 redirect) | |

**Naming:** `describe('AuthService')` → `it('should return false for isLoggedIn() on init')`.

**SSR tests:** mock `PLATFORM_ID` to test both browser and server paths when `isPlatformBrowser` is used.

**Do not reintroduce Karma/Jasmine.** The stack is Vitest. If you see `karma.conf.js` — delete it.

### Backend — `backend/` (Jest 30)

```bash
cd backend
npm test              # unit tests
npm run test:e2e      # e2e (requires PostgreSQL — uses Testcontainers)
npm run test:cov      # coverage report
```

**E2e tests** spin up a real PostgreSQL 16 container via Testcontainers and run all migrations before the suite. Never mock the database in e2e tests — that's how prod divergence happens.

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

Guards and the auth interceptor already do this — use them as a reference.

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

### All HTTP calls through `ApiService`

`ApiService` prepends the base URL and `/api` prefix. Never use `HttpClient` directly in components.

```typescript
// ✅
this.api.get<Post[]>('/blog')

// ❌
this.http.get('http://localhost:3000/api/blog')
```

---

## 8. NestJS conventions (`backend/`)

### Migrations — non-negotiable rules

- **Never edit a migration after it has been applied** to any environment (local, RDS). Write a new one.
- **Never set `synchronize: true`** — hardcoded `false` in both `app.module.ts` and `data-source.ts`.
- One migration = one concern.
- Run `npm run migration:show` before and after `npm run migration:run` to verify.

```bash
# Generate:
npm run migration:generate -- src/database/migrations/AddBlogCoverImage

# Run:
npm run migration:run

# Revert last:
npm run migration:revert
```

### DTOs and validation

Every controller method that accepts a body takes a DTO class with `class-validator` decorators. The global `ValidationPipe` runs with `whitelist: true` — extra fields are silently stripped (prod) or rejected with 400 (local). Document intentional asymmetries.

### HTML sanitization

Apply `SanitizeHtmlPipe` to any DTO field that accepts Quill HTML output. The allowed-tags whitelist in `sanitize-html.pipe.ts` must stay in sync with `ui/src/app/shared/config/quill.config.ts`.

### Route guards

Use per-route `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`. Do not add a global guard — several endpoints are intentionally anonymous (`POST /needs-forms/wash`, `POST /complaints`).

### No `nest start` in production

`lambda.ts` is the Lambda entry point. `main.ts` is for local development only. Do not mix them.

---

## 9. Security rules

| Rule | Why |
| --- | --- |
| Never commit `.env` or any file with real secrets | Secrets are in GitHub Secrets + Lambda env vars |
| Never use `*` as a CORS origin | Configured explicitly in `main.ts` via `FRONTEND_URL` |
| Always sanitize Quill HTML server-side | A compromised manager account can `curl` directly |
| Keep `DB_PORT` and `DB_PASSWORD` out of version control | Use `.env.example` for templates only |
| Never widen the S3 IAM policy beyond `csd-media/*` | Least-privilege principle |
| Rotate `JWT_SECRET` if it leaks — min 32 characters | App refuses to start if shorter |

---

## 10. Common mistakes to avoid

| Mistake | Correct approach |
| --- | --- |
| Committing directly to `main` | Always use a branch + PR |
| Hardcoding `http://localhost:3000` anywhere | Use `environment.apiUrl` via `ApiService` |
| Adding `localStorage` without `isPlatformBrowser` | SSR crashes silently in production |
| Editing an already-applied migration | Write a new migration file |
| Adding `NgModule` | Project is fully standalone — no modules |
| Using `type` for object shapes | Use `interface` (ESLint error) |
| Adding a translation key to only one language file | Always update both `ua.json` and `en.json` |
| Leaving `console.log` in code | Remove before committing |
| Not running `npm run lint` before pushing | Breaks CI, blocks the PR |
| Using `synchronize: true` in TypeORM config | Will destroy production schema on deploy |
| Importing route components eagerly | Always use `loadComponent` / `loadChildren` |
| Bypassing `ApiService` for HTTP calls | Interceptor and base URL stay centralized |

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
