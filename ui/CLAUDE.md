# CLAUDE.md — ui (Angular 21 SSR)

Specific guidance for the `/ui` app. Repo-wide rules and personal style preferences live in `../CLAUDE.md` — read that first.

This file holds the **rules an agent must not break**. The descriptive material — render modes, the full npm-script table, the testing reality, deployment, known debt — now lives in [`README.md`](./README.md), and the feature write-ups live in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §7. Do not duplicate them here; when they disagree with the code, the code wins.

## Stack (verified against `package.json` / `angular.json`)

- **Angular 21.2** standalone components + signals + SSR (`@angular/ssr@^21.2.15`).
- **Zoneless.** `polyfills` is `["@angular/localize/init"]` only — there is no `zone.js`. This is not cosmetic; see the language rule below.
- **Builder:** `@angular/build:application` (`outputMode: "server"`, SSR entry `src/server.ts`, browser entry `src/main.ts`, server bootstrap `src/main.server.ts`).
- **TypeScript:** `~5.9.2`.
- **HTTP:** `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))`.
- **Hydration:** `provideClientHydration(withEventReplay())`.
- **i18n:** `@ngx-translate/core@^17` + `@ngx-translate/http-loader`. JSON in `src/assets/i18n/{ua,en}.json`. `app.ts` calls `addLangs(['ua','en'])` then `use('ua')` — **hardcoded, never persisted**, so a reload always returns to Ukrainian.
- **Rich text:** `ngx-quill@^30` + Quill 2 (CSS imported globally in `angular.json`).
- **Maps:** Leaflet + `leaflet.markercluster` — **loaded from the unpkg CDN, not npm.** See the section below before touching anything map-related.
- **Icons:** `lucide-angular`.
- **Tests:** Vitest 4 via `@angular/build:unit-test` (`ng test`). **Exactly 2 spec files exist** — `app.spec.ts` and `features/contact/inquiry-form.spec.ts`. A green `npm test` proves almost nothing.
- **Lint:** ESLint 10 + `angular-eslint@21` + `typescript-eslint` + `eslint-plugin-prettier`.
- ⚠ `package.json` contains a squatted placeholder dependency, `"ngx-translate": "^0.0.1-security"`. The real package is `@ngx-translate/core`. Don't import from `ngx-translate`, and don't "fix" the version — the entry should be removed, which is tracked in `README.md` § Known debt.

## Layout

```
ui/
├── angular.json                    # one project "ui", scss styles, ssr enabled
├── lambda.mjs                      # ⚠ Lambda entry — wraps `app` from dist/ui/server/server.mjs
├── ssr-lambda.mjs                  # ⚠ DEAD alternative entry (wraps `handler`, not `app`).
│                                   #   serverless.yml points at lambda.mjs. Don't edit this one by mistake.
├── serverless.yml                  # service: csd-ssr, handler: lambda.handler
├── eslint.config.mjs
├── tsconfig.{json,app,spec}.json
├── playwright.config.ts            # ⚠ two webServers — stub API :3000, SSR app :4000
├── e2e/
│   ├── tsconfig.json               # `typecheck` (tsconfig.app.json) does NOT cover e2e/
│   ├── specs/                      # 6 specs, one scenario each
│   ├── support/test.ts             # import `test`/`expect` from here, not @playwright/test
│   └── stub-api/{server.mjs,fixtures/}
└── src/
    ├── index.html                  # ⚠ loads Leaflet + markercluster <script>/<link> from unpkg
    ├── main.ts / main.server.ts / server.ts
    ├── environments/{environment,environment.prod}.ts   # swapped via fileReplacements
    ├── app/
    │   ├── app.ts                  # <app-root>: standalone, signals, ngx-translate init
    │   ├── app.config.ts / app.config.server.ts
    │   ├── app.routes.ts           # public routes; `partners` is FROZEN (commented out, intentionally)
    │   ├── app.routes.server.ts    # blog/:slug = Server · activity-map = Client · ** = Server. No prerendering.
    │   ├── core/
    │   │   ├── services/           # api · auth · language · page-title
    │   │   ├── interceptors/auth.interceptor.ts
    │   │   └── guards/auth.guard.ts        # authGuard / managerGuard / adminGuard / superAdminGuard
    │   ├── layout/{header,footer}/
    │   ├── shared/
    │   │   ├── components/         # carousel · file-upload · form-stepper · location-selector · sticky-cta · turnstile
    │   │   ├── config/quill.config.ts      # keep in sync with backend SanitizeHtmlPipe
    │   │   ├── pipes/quill-html.pipe.ts    # the only pipe in the app
    │   │   ├── directives/ · interfaces/ · services/
    │   └── features/               # 14 top-level folders — 13 public + admin/ (which has 13 subfolders)
    │       ├── home/ about/ blog/ contact/ not-found/
    │       ├── about/{about-shell.ts, about.ts, documents/}   # shell + public document registry
    │       ├── activity-map/                # Leaflet, lazy children, Client-rendered
    │       ├── cooperation/{procurement,vacancy,testimonial,complaint}/
    │       ├── needs/{wash-form,recovery-form,winterization-form}/
    │       ├── admin/                       # managerGuard on parent; sub-routes adminGuard / superAdminGuard
    │       ├── login/ register/ forgot-password/ reset-password/
    │       └── partners/                    # ⚠ route FROZEN in app.routes.ts — component and API are ready
    └── assets/{i18n,data}/
```

`features/` holds 14 folders, one of which is `admin/`; `admin/` itself has 13 subfolders: `about`, `complaints`, `inquiries`, `procurements`, `recovery-form-detail`, `recovery-forms-list`, `testimonials`, `users-management`, `vacancies`, `wash-form-detail`, `wash-forms-list`, `winterization-form-detail`, `winterization-forms-list`. (Earlier documents wrote this as "14 public + 13 admin", which double-counts `admin/`.)

## The language rule — read this before writing any language-dependent logic

**Use `LanguageService`. Never read `translate.currentLang` in new code.**

The app is zoneless. `translate.currentLang` is a plain property: reading it subscribes to nothing, so a getter like `get isUa() { return this.translate.currentLang === 'ua'; }` re-evaluates only by accident, when an impure `| translate` pipe in the same view happens to call `markForCheck`. The bug it produces is intermittent and looks like a caching problem, which is why it keeps getting reintroduced.

```ts
// ✅
private readonly language = inject(LanguageService);
readonly title = computed(() => this.language.isUa() ? this.item().titleUa : this.item().titleEn);

// ❌ not reactive under zoneless change detection
get title() { return this.translate.currentLang === 'ua' ? ... : ...; }
```

`LanguageService` (`core/services/language.service.ts`) wraps `onLangChange` in `toSignal` and exposes `lang()` and `isUa()`.

**~35 files still read `translate.currentLang` directly.** Re-derive both sides before quoting either:

```bash
grep -rl "translate\.currentLang" src --include=*.ts | wc -l                      # 35 at e5a4578
grep -rl "LanguageService" src --include=*.ts | grep -v language.service.ts | wc -l  # 19 consumers (20 files incl. the service itself)
```

The ratio is the point: **copying a neighbouring component reproduces the bug.** Copy from a `LanguageService` consumer instead. Migrating an existing file is welcome; leaving a new one on `currentLang` is not.

## Leaflet is not an npm dependency

`angular.json:61-66` lists `leaflet` and `leaflet.markercluster` under `allowedCommonJsDependencies`. **Those two entries are dead config.** Neither package is in `dependencies` or `devDependencies` — only `@types/leaflet` and `@types/leaflet.markercluster` are. The runtime libraries come from `<script>` and `<link>` tags pointing at `https://unpkg.com` in `src/index.html`, and `map-view.ts` reads the global via `(globalThis as unknown as { L: typeof Leaflet }).L`.

Both statements are true at once: the config entries exist, and they do nothing. `quill` and `quill-delta` in the same array *are* real dependencies and *are* load-bearing.

Consequences for an agent:

- **Don't `import` Leaflet.** A bundler import will not resolve. `import type * as Leaflet from 'leaflet'` for types only — that is what `map-view.ts` does.
- **Don't remove `https://unpkg.com` from the CSP.** It is load-bearing for `script-src`, `style-src` and `img-src`; drop it and the activity map dies. See `../infra/SECURITY-HEADERS.md` §2.2.
- **Don't `npm install leaflet` to "fix" the missing dependency** without also removing the CDN tags and re-verifying SSR. Half a migration is worse than either end state.
- The two dead `allowedCommonJsDependencies` entries are a cleanup candidate — removing them is safe, but do it as its own change, not silently.

## Conventions (verified against current code)

- **Standalone-only.** No `NgModule` anywhere. Imports are declared on the component.
- **Signals over BehaviorSubject** for component/service state. `AuthService` is the reference example.
- **`inject()` not constructor DI.** Matches `api.service.ts`, `auth.service.ts`, the guards and the interceptor.
- **Selector prefix `app-`**, kebab-case components, camelCase directives — enforced by `angular-eslint`. Lint fails otherwise.
- **`interface`, not `type`, for object shapes** — `@typescript-eslint/consistent-type-definitions` is set to `error`.
- **SCSS** for styles. **Lazy-load every feature** via `loadComponent` / `loadChildren`; the router never imports components eagerly.
- **Translation:** `| translate` in templates, service for imperative use. Add every new key to **both** `ua.json` and `en.json`.
- **Quill HTML** is rendered through the `quillHtml` pipe. Keep `shared/config/quill.config.ts` aligned with `backend/src/common/pipes/sanitize-html.pipe.ts` — and note the backend only sanitizes procurement and vacancy, so for blog and `/pages` the frontend pipe is the *only* thing standing between stored HTML and the DOM.

### API calls — the rule and the real exceptions

Route HTTP through `ApiService` (`core/services/api.service.ts`). It prepends `environment.apiUrl + '/api'` and its `post()` accepts an optional headers map.

The old "**all** API calls go through `ApiService`" claim is false, and pretending otherwise leads to the wrong fix. Raw `fetch` is used deliberately in two places:

1. **XLSX/CSV downloads** in the five admin list components — `ApiService` returns JSON-typed `Observable`s and cannot stream a blob.
2. **Direct-to-S3 presigned uploads** — these must *not* carry the `Authorization` header the interceptor would add, and they don't target the API host at all. Five components do this: `shared/components/file-upload/file-upload.ts`, `admin/about/documents/document-files.ts`, `admin/testimonials/testimonial-edit.ts`, `cooperation/testimonial/testimonial-form.ts` and `home/home.ts` (the last uses the presigned **PUT** flow).

Anything else goes through `ApiService`. If you add a third category, document why in the file. Re-derive the membership of both lists before editing them — `grep -rn "fetch(" src/app --include=*.ts`.

### SSR safety — and the five files that already violate it

- `authInterceptor` and every `*Guard` check `isPlatformBrowser(inject(PLATFORM_ID))` before touching `localStorage` or navigating. **Replicate that pattern in any new browser-only code.**
- Server-side, guards return `true` so SSR can render; auth is enforced on the client after hydration. **Guards are not security** — security is the backend's job.
- **Known violation, do not copy:** `admin/complaints/complaints-list.ts`, `admin/inquiries/inquiries-list.ts`, `admin/recovery-forms-list/recovery-forms-list.ts`, `admin/wash-forms-list/wash-forms-list.ts` and `admin/winterization-forms-list/winterization-forms-list.ts` all call `localStorage.getItem('token')` with **no `isPlatformBrowser` guard**, to attach a bearer token to their raw export `fetch`. They happen to work because the calls are user-triggered, post-hydration. They are tracked as debt in `README.md`; if you touch one of those files, guard it.

### Turnstile contract (frontend half)

The `<app-turnstile>` shared component loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` in `afterNextRender` (browser only) and exposes a `getToken()` provider that pre-fetches one token and **resets the widget after each use** — Cloudflare tokens are single-use, and both guarded calls (`upload/needs-presigned` per file, then the form submit) each need a fresh one.

The token travels in the **`x-turnstile-token` header**, never in the body — the backend's `forbidNonWhitelisted: true` would reject a body field. Senders: `recovery-form.ts`, `winterization-form.ts`, `file-upload.ts`. The site key is `environment.turnstileSiteKey`; dev uses Cloudflare's always-pass test key.

## Environments

`src/environments/environment.ts` and `environment.prod.ts` export **four** keys — keep both files in lockstep or the production build silently loses a flag:

| Key | dev | prod |
| --- | --- | --- |
| `production` | `false` | `true` |
| `apiUrl` | `http://localhost:3000` | the API Gateway URL |
| `turnstileSiteKey` | Cloudflare test key (always passes) | the real site key (public, safe to commit) |
| `winterizationHouseholdEnabled` | `false` | `false` |

`winterizationHouseholdEnabled` is **UX only** — the real gate is the backend's `WINTERIZATION_HOUSEHOLD_ENABLED`, which answers 422 regardless of what the UI allows. Flipping the frontend flag alone changes nothing except that users can now submit a form that fails. There is no staging environment file.

## Build, test, lint — the traps

Full script table: [`README.md` § npm scripts](./README.md) and `../CONTRIBUTING.md` §4. The three things that mislead people:

- **`format:check` covers SCSS only** (`prettier --check "src/**/*.scss"`), while `npm run format` rewrites `.ts`, `.html` **and** `.scss`. So `npm run verify` never format-checks TypeScript or templates, and a Prettier-dirty `.ts` file passes.
- **`npm run lint` here is plain `ng lint` — no `--fix`.** Only the *backend*'s `lint` mutates files. Use `npm run lint:fix` if you want fixes. Don't carry the backend's "lint rewrites your files" caveat over to this app.
- **This app is now gated pre-merge**, by the `ui` job in `.github/workflows/test.yml` (`typecheck` → `lint` → `format:check` → `test:ci` → `build`) and the `e2e` job (Playwright). What a green PR still does **not** prove: `.ts`/`.html` formatting (SCSS-only `format:check`) and behaviour beyond two unit specs and six browser scenarios.

`eslint.config.mjs` disables `prettier/prettier` for `.html` ("Prettier must NOT format Angular templates"), so `npm run format` may reformat a template that lint will never complain about. If a reformat breaks control-flow syntax (`@if`, `@for`), revert that file rather than fighting Prettier.

## Browser tests — the rules

Run with `npm run e2e`. Details and the two local gotchas (stop your backend first; the suite builds with `--configuration development`) are in [`README.md` § Browser tests](./README.md).

- **Never mock the API with `page.route()` for data that appears on first paint.** This app renders the first paint in Node and `provideClientHydration()` transfers the result, so server-side requests never touch the browser's network stack and the client does not re-request them. The interception point is `e2e/stub-api/server.mjs`, a real process on `:3000` — the port `environment.ts` points at. `page.route()` is still correct for client-side navigations and for forcing error states.
- **Never test SSR through `page.goto()`.** By the time you have a DOM, Angular has hydrated and CSR looks identical. Assert on the raw response: `request.get('/')`, then check the HTML. See `e2e/specs/ssr.spec.ts`.
- **Never build with plain `ng build` for e2e.** The default configuration is `production`, whose `fileReplacements` swap in `environment.prod.ts` — the tests would run against the live API Gateway and the real Turnstile key. Use `npm run build:e2e`.
- **Locators: `getByRole` / `getByLabel` / `getByText` / `getByPlaceholder` only.** Never CSS classes. `data-testid` only where there is genuinely no accessible name, and then add the attribute to the template with a `<!-- CHANGED: -->` marker. Note the header renders its language switch and login/logout controls **twice** (mobile + desktop, CSS-hidden), so those locators need `.filter({ visible: true })`.
- **No `waitForTimeout`.** Playwright auto-waits inside `expect(locator).toBeVisible()`.
- **No `toHaveScreenshot`.** Largest source of flakiness; not worth it here.
- **Cap the suite at 12 tests** (6 today). A flaky suite gets ignored, and an ignored suite makes CI meaningless. `retries` is 1 in CI and 0 locally — that one retry exists to *label* a flake in the report, not to make it pass. A test that needs it is fixed or deleted the same day.
- `typecheck` runs `ngc -p tsconfig.app.json`, which is `src/**` only, and Playwright's loader strips types without checking them. **`npm run typecheck:e2e` is the only thing that type-checks a spec** — the `e2e` CI job runs it.

## Don'ts

- **Don't read `translate.currentLang` in new code** — use `LanguageService`. See the language rule above.
- **Don't `import` Leaflet or remove `unpkg.com` from the CSP.** See the Leaflet section.
- **Don't use `localStorage`/`sessionStorage` without an `isPlatformBrowser` check** — and don't copy the five admin list components that do.
- **Don't add NgModules.** The project is fully standalone.
- **Don't add eager route imports.** `loadComponent` / `loadChildren` only.
- **Don't reintroduce Karma/Jasmine.** The stack is Vitest.
- **Don't change `activity-map` to `RenderMode.Server`** without proving Leaflet survives SSR — it hard-depends on `window`.
- **Don't edit `ssr-lambda.mjs`** expecting it to take effect; `serverless.yml` points at `lambda.mjs`.
- **Don't un-freeze the `partners` route.** It is commented out on purpose until the fund supplies partner logos and data; the component and `GET /api/partners` are both ready.
- **Don't trust a green `npm test`.** Two spec files. If your change matters, it needs a spec — see `README.md` § Testing.
