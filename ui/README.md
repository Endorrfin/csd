# CSD Frontend

Angular 21 standalone + signals + SSR. Deploys to an AWS Lambda (SSR) plus an S3
bucket behind CloudFront, via GitHub Actions, after the backend deploy succeeds.

## Stack

- **Framework**: Angular 21, standalone components, signals, **zoneless** — there is no `zone.js` dependency and the only polyfill is `@angular/localize/init`
- **SSR**: `@angular/ssr` with `outputMode: "server"`, `provideClientHydration(withEventReplay())`, Express entry at `src/server.ts`
- **Routing**: lazy `loadComponent` / `loadChildren` per feature; guards `managerGuard` / `adminGuard` / `superAdminGuard`
- **HTTP**: `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))`; central `ApiService` prepends `/api`
- **i18n**: `@ngx-translate/core` 17 + `http-loader`, fallback `ua`, files in `src/assets/i18n/{ua,en}.json`
- **Rich text**: Quill 2 via `ngx-quill`
- **Icons**: `lucide-angular`
- **Maps**: Leaflet + `leaflet.markercluster` — **loaded from the unpkg CDN**, see [Leaflet](#leaflet-is-not-an-npm-dependency)
- **Build / lint / test**: `@angular/build`, ESLint 10 + `angular-eslint`, Prettier 3, Vitest 4
- **SSR Lambda adapter**: `serverless-http` wrapping the SSR Express app (`lambda.mjs`)

> Architecture, data model and feature write-ups live in
> [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md). The canonical command
> list is [`../CONTRIBUTING.md`](../CONTRIBUTING.md) §4, and the Angular
> conventions a contributor or agent must follow are in
> [`CLAUDE.md`](./CLAUDE.md). This README covers the app's shape and its
> operational quirks.

## Local setup

The backend must be running first — see [`../backend/README.md`](../backend/README.md).

```bash
cd ui
npm install
npm start          # http://localhost:4200
```

`src/environments/environment.ts` points the dev server at
`http://localhost:3000`. There is no proxy config; `ApiService` builds absolute
URLs from `environment.apiUrl`.

### Environment files

**`environment.model.ts` is the key list — read it there, not here.** All three
files declare `: Environment` (every member `readonly`), and `tsconfig.app.json`
includes `src/**/*.ts`, so all three are type-checked on every build, `ng serve`
included. That closes a real hole: `fileReplacements` swaps the module *after*
the import site is resolved, so consumers are only ever checked against
`environment.ts` — a key missing from `environment.prod.ts` used to compile
cleanly and ship `undefined`, first visible on the live site. It now fails
locally with `TS2741`. Adding a key means declaring it in the interface, then in
all three files. Full per-file reference:
[`../docs/ARCHITECTURE.md` §9](../docs/ARCHITECTURE.md#9-environment-variables-reference).

What the interface cannot express is **why three of the values differ by build
target**:

| Key | Why it differs |
| --- | --- |
| `apiUrl` | dev → `http://localhost:3000`; prod → the API Gateway URL, called directly by the browser and not fronted by CloudFront; staging → the `__STAGING_API_BASE__` sentinel (below) |
| `turnstileSiteKey` | dev and staging use Cloudflare's always-passing test key. The real key is bound to `www.csd-fund.org` and must pair with the `TURNSTILE_SECRET_KEY` GitHub secret, which staging deliberately does not define — Turnstile stays a production-only path |
| `cartoBasemapKey` | the **same** key in all three, but it is restricted by referring domain and the staging host is not registered, so basemap tiles there keep the "API KEY REQUIRED" watermark |

The other two do not vary. `production` is `true` for the prod **and** the
staging build. `winterizationHouseholdEnabled` is **UX only** — it renders the
household card disabled, while the real gate is the backend's
`WINTERIZATION_HOUSEHOLD_ENABLED`, which answers 422 regardless of what the UI
allows. The compiler guarantees that key *exists* in all three files; keeping its
*value* in step is still manual.

Staging builds as `ng build --configuration production,staging`: Angular has no
configuration inheritance, so `staging` carries **only** the `fileReplacements`
and composes on top of `production` for budgets and output hashing.

**`__STAGING_API_BASE__` is a sentinel and is never edited by hand** —
`deploy-staging.yml` substitutes it from the `csd-api-staging` stack's
`ServiceEndpoint` output and fails the run if it survives. So a local
`ng build --configuration production,staging` yields a bundle whose API calls
404; that is intended. To exercise one locally, copy the file aside, substitute
the sentinel, build, then restore it.

**Both keys in these files are public by design and belong in git.**
`turnstileSiteKey` is a Turnstile *site* key — its secret half is
`TURNSTILE_SECRET_KEY`, a GitHub secret the browser never sees — and
`cartoBasemapKey` is restricted by referring domain rather than kept secret. Both
ship in the client bundle, so moving either into a GitHub secret would hide
nothing from anyone and would silently break whichever build forgot to inject it.
Nothing that is actually secret belongs in `src/environments/`.

## npm scripts

```bash
npm run verify     # typecheck → lint → format:check → test:ci → build
```

| Script | What it runs |
| --- | --- |
| `start` | `ng serve` |
| `build` | `ng build` |
| `watch` | `ng build --watch --configuration development` |
| `test` / `test:ci` | `ng test --no-watch` (Vitest via `@angular/build:unit-test`) |
| `test:watch` | `ng test` |
| `lint` | `ng lint` (no `--fix`) |
| `lint:fix` | `ng lint --fix` |
| `typecheck` | `ngc -p tsconfig.app.json --noEmit` |
| `format` | `prettier --write "src/**/*.{ts,html,scss}"` |
| `format:check` | `prettier --check "src/**/*.scss"` |
| `serve:ssr:ui` | `node dist/ui/server/server.mjs` — run the built SSR bundle locally |

Two things to notice in that table:

- **`format:check` covers SCSS only**, while `format` rewrites `.ts`, `.html`
  *and* `.scss`. So `npm run verify` never format-checks TypeScript or
  templates. Run `npm run format` before committing.
- **`verify` ends in `build`** (as the backend's does). That matters more here,
  because `npm run verify` is the *only* place `ng build` runs before merge —
  CI never builds this app until after the merge.

## Testing — read this before you trust a green PR

The app has **2 spec files** for 107 TypeScript files under `src/app`:

```
src/app/app.spec.ts
src/app/features/contact/inquiry-form.spec.ts
```

There is **no `vitest.config.ts`**, and `angular.json`'s `test` target has no
`options` block at all — just `"builder": "@angular/build:unit-test"`. Test
setup is entirely on defaults.

**This app is gated pre-merge.** `.github/workflows/test.yml` ("PR Checks") has a
`ui` job running `typecheck` → `lint` → `format:check` → `test:ci` → `build` —
this app's `verify` chain verbatim — and an `e2e` job running the Playwright
suite. Both run on every pull request, with no `paths:` filter.

What the `ui` job still does not prove: `format:check` covers **SCSS only**, and
`ng test` is the two spec files above. A green PR means the app typechecks,
lints and builds — not that it is tested.

### Browser tests (Playwright)

```
ui/playwright.config.ts          # two webServers: stub API :3000, SSR app :4000
ui/e2e/specs/                    # 6 specs, one scenario each
ui/e2e/support/test.ts           # shared base test — blocks unpkg + Cloudflare
ui/e2e/stub-api/server.mjs       # Express stub + JSON fixtures
```

```bash
npm run e2e            # headless, builds and serves the app itself
npm run e2e:ui         # Playwright UI mode
npm run e2e:report     # open the last HTML report
npm run typecheck:e2e  # tsc over e2e/ — `typecheck` covers src/ only
```

Two things to know before running them:

- **Stop your local backend first.** The stub API binds `:3000` — the same port
  as `npm run start:dev` — and `reuseExistingServer` is `false` for it on
  purpose, so a running backend makes Playwright fail with "port already used"
  rather than silently testing against your real API and database.
- **The suite builds with `--configuration development`**, not the default
  production build, because production `fileReplacements` swap in
  `environment.prod.ts` and the tests would then run against the live API
  Gateway and the real Turnstile key.

The API is stubbed rather than mocked with `page.route()` because this app
renders the first paint in Node and `provideClientHydration()` transfers the
result — server-side requests never reach the browser's network stack, and the
client never re-requests what SSR already fetched. Scenarios that need a real
backend (uploads, admin auth, CRUD) are not covered yet.

## Rendering

`src/app/app.routes.server.ts` defines exactly three rules:

| Path | Mode |
| --- | --- |
| `blog/:slug` | `RenderMode.Server` |
| `activity-map` | **`RenderMode.Client`** |
| `**` | `RenderMode.Server` |

**Nothing is prerendered.** There is no `RenderMode.Prerender` and no
`getPrerenderParams` anywhere — every request that is not `activity-map` is
rendered on the SSR Lambda at request time. `activity-map` is client-only
because `map-view.ts` reads Leaflet off `globalThis.L`, which only exists once
the CDN `<script>` in `index.html` has run in a browser.

Three SSR hardening details that are easy to break — the first two live in
`src/server.ts`, the third in `serverless.yml`:

- `AngularNodeAppEngine` is constructed with
  `trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto']`, and the
  middleware **deletes** the other `X-Forwarded-*` headers that API Gateway
  sends. Angular 21.2.x's `sanitizeRequestHeaders()` deopts to a CSR shell on
  any untrusted `X-Forwarded-*` header — **silently, with nothing logged**.
- `PUBLIC_HOST` (set only in `serverless.yml`) restores the public hostname
  behind API Gateway so host validation passes. Locally the middleware is a
  no-op.
- **`NG_ALLOWED_HOSTS` is the other half of `PUBLIC_HOST`, and staging needs
  both.** `PUBLIC_HOST` only fixes the hostname the middleware pins; the
  allowlist it is checked against comes from `angular.json`'s
  `security.allowedHosts`, which the builder **bakes into the server manifest at
  build time** — prod hosts only. `@angular/ssr` unions that baked list with
  `NG_ALLOWED_HOSTS` at runtime, which is what lets staging pass without a prod
  rebuild. It is set in the `staging` block of `serverless.yml` and nowhere
  else.

If SSR "stops working" while the page still returns 200, this is the first place
to look. The symptom is a CSR shell with no `ng-server-context` attribute —
exactly what the deploy smoke test greps for.

### SSR must not fetch its own static assets

The invariant and the incident behind it are in
[`../docs/ARCHITECTURE.md` §8.3](../docs/ARCHITECTURE.md#83-ssr-static-asset-resolution--an-invariant).
The rule you need while editing this app is short:

**Add a build-time JSON under `src/assets/` and read it with `HttpClient`, and
you must register it in `SERVER_STATIC_ASSETS`**
(`core/tokens/server-static-assets.token.ts`). During SSR a root-relative URL
resolves against the *request host*, so an unregistered path becomes a real
outbound request from the Lambda — which cannot answer it, because
`serverless.yml` excludes `dist/ui/browser/**`. `serverAssetsInterceptor` serves
registered paths from the bundle and, for anything else, logs `console.error`
and returns a null body: loud, never fatal. Translations bypass `HttpClient`
altogether via `ServerTranslateLoader`.

Both are server-only: the interceptor is registered in `app.config.ts` for both
platforms but no-ops in the browser, because the token is provided only in
`app.config.server.ts` — which is also what keeps the JSON out of the browser
bundle. `locations.json` (4.7 MB) is deliberately mapped to `[]` on the server;
it is a client-only dataset, and bundling it would inline 4.7 MB into every
rendered page carrying a location selector.

## Application structure

```
ui/
├── lambda.mjs                 # serverless-http wrapper around the built SSR Express app
├── serverless.yml             # csd-ssr — ANY / and ANY /{proxy+}; per-stage env
│                              #   (PUBLIC_HOST; + NG_ALLOWED_HOSTS on staging)
├── angular.json
└── src/
    ├── index.html             # Leaflet CSS/JS <link>/<script> from unpkg
    ├── server.ts              # SSR Express entry (see Rendering above)
    ├── environments/          # environment.ts + .prod.ts + .staging.ts
    ├── assets/
    │   ├── i18n/{ua,en}.json  # full UI translations
    │   └── data/              # locations.json, activities.json (fed by ../convertors)
    └── app/
        ├── app.config.ts      # providers: router, http+interceptors, hydration, translate
        ├── app.config.server.ts               # SSR-only overrides (see Rendering above)
        ├── app.routes.ts      # public routes
        ├── app.routes.server.ts
        ├── core/
        │   ├── guards/auth.guard.ts          # managerGuard, adminGuard, superAdminGuard
        │   ├── i18n/server-translate.loader.ts    # SSR-only TranslateLoader
        │   ├── interceptors/                 # auth.interceptor, server-assets.interceptor
        │   ├── tokens/server-static-assets.token.ts
        │   └── services/                     # api, auth, language, page-title
        ├── shared/
        │   ├── components/    # carousel, file-upload, form-stepper,
        │   │                  # location-selector, sticky-cta, turnstile
        │   ├── services/location.service.ts
        │   ├── pipes/quill-html.pipe.ts
        │   ├── config/quill.config.ts
        │   └── directives/fade-in-on-scroll.directive.ts
        ├── layout/            # header, footer
        └── features/          # 14 public folders + admin/ (13 subfolders)
```

**14 public feature folders**: `about`, `activity-map`, `admin`, `blog`,
`contact`, `cooperation`, `forgot-password`, `home`, `login`, `needs`,
`not-found`, `partners`, `register`, `reset-password`.

**13 admin feature folders** under `features/admin/`: `about`, `complaints`,
`inquiries`, `procurements`, `recovery-form-detail`, `recovery-forms-list`,
`testimonials`, `users-management`, `vacancies`, `wash-form-detail`,
`wash-forms-list`, `winterization-form-detail`, `winterization-forms-list`.

`partners/` is present but its route is **commented out** in `app.routes.ts`
(search "FROZEN"), together with the matching nav link in `layout/header`. The
component and the backend endpoint both work; the fund has not supplied the
content.

`/needs` is a tabbed shell with three live forms — `wash-form`,
`recovery-form`, `winterization-form` — and one disabled "coming soon" tab.

### Needs forms — one component, two modes

Each needs form is a single component serving both the public submit and the
admin full-edit, switched by `@Input() mode: 'create' | 'edit'`. In edit mode it
renders no Turnstile, no upload dropzones and no draft banner, and hydrates from
`initialData` instead of the localStorage draft. The exact input/output
contract: [`../docs/ARCHITECTURE.md` §7.10](../docs/ARCHITECTURE.md#710-shared-needs-infrastructure).

## Language handling

`App`'s constructor calls `translate.addLangs(['ua','en'])` then
`translate.use('ua')` — **hardcoded, on every bootstrap.** The choice is never
persisted: no localStorage, no cookie, no URL segment. A reload always returns
to Ukrainian. That is current behaviour, not a bug report; if you change it,
change it deliberately.

**Use `LanguageService` for anything language-dependent.** The app is zoneless,
so `TranslateService.currentLang` — a plain getter, not a signal — does not
trigger change detection, and a template reading it will silently keep the old
language. `LanguageService` exposes the current language as a signal; the
established pattern is a computed `isUa()` called from the template.

Roughly **35 files still read `translate.currentLang`** against **19 that use
`LanguageService`**. The migration is partial, so copying a neighbouring
component is as likely to reproduce the bug as to avoid it. Check which one you
are copying.

## Leaflet is not an npm dependency

`leaflet` and `leaflet.markercluster` are loaded from the **unpkg CDN** in
`src/index.html`:

```html
<link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" ... />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<link href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" ... />
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

Only `@types/leaflet` and `@types/leaflet.markercluster` are installed. The
`allowedCommonJsDependencies` entry in `angular.json` still lists `leaflet` and
`leaflet.markercluster`, but that is vestigial — nothing imports them from
`node_modules`.

Consequences worth knowing:

- The activity map depends on unpkg being reachable. There is no bundled fallback.
- `unpkg.com` must stay in the CSP's `script-src`, `style-src` and `img-src`.
  It is present in the committed `infra/cloudfront-response-headers-policy.json`;
  that file is applied to CloudFront by hand, so the *live* header is not
  checkable from this repo — see [`../infra/SECURITY-HEADERS.md`](../infra/SECURITY-HEADERS.md).

## Known debt

Real, committed, and worth knowing before you copy the surrounding code.

- **Five admin list components call `localStorage.getItem('token')` directly,
  with no `isPlatformBrowser` guard**, to attach the JWT to a raw `fetch` for
  the XLSX/CSV export: `wash-forms-list`, `recovery-forms-list`,
  `winterization-forms-list`, `complaints-list`, `inquiries-list`. This breaks
  the SSR rule `CLAUDE.md` states as an invariant, and the "all API calls go
  through `ApiService`" rule as well. It has not blown up because those routes
  sit behind `managerGuard` — not because it is safe.
- **`package.json` carries a squatted dependency**:
  `"ngx-translate": "^0.0.1-security"`. That is not the real package (the real
  ones are `@ngx-translate/core` and `@ngx-translate/http-loader`, both present)
  and it is imported nowhere. Remove it when you next touch dependencies.
- 2 spec files for 107 source files — see the Testing section above.
- `format:check` covers SCSS only, so TS/HTML formatting drift is invisible to `verify`.
- The partial `LanguageService` migration described above.

## Deployment

`.github/workflows/deploy.yml`, job `deploy-frontend`. It runs only after
`deploy-backend` succeeds, and only on a merged PR to `main` or a manual
`workflow_dispatch`.

1. `npm ci`
2. `npx ng build --configuration production`
3. `aws s3 sync dist/ui/browser/ s3://csd-fund-static/ --delete` with
   `max-age=31536000, immutable`, excluding `*.html`
4. A second sync for `*.html` only, with `max-age=0, must-revalidate`
5. `npx serverless deploy --stage prod` — SSR Lambda `csd-ssr-prod-ssr`
6. `aws cloudfront create-invalidation --distribution-id E3U465AMSVR9PN --paths "/*"`
7. Smoke test: `GET /` on the first entry of the `FRONTEND_URL` allowlist, six
   retries, grepping for **`ng-server-context`** — not `<app-root>`, which
   matches the CSR shell too and therefore failed exactly when SSR started
   working

The production `ng build` in step 2 is the first time this app is compiled in
CI. Nothing lints, typechecks or tests it, before or after.

A push to `staging/**` runs the parallel `deploy-staging.yml` instead — same
step order, a `staging` stage of both stacks, and two fail-closed guards of its
own:
[`../docs/ARCHITECTURE.md` §12.4](../docs/ARCHITECTURE.md#124-post-merge-to-a-staging-branch--githubworkflowsdeploy-stagingyml).

Rollback, log inspection and cache-invalidation procedures are in
[`../docs/ARCHITECTURE.md` §16](../docs/ARCHITECTURE.md#16-runbook--operational-procedures).

## Angular CLI reference

```bash
ng generate component features/<name>    # scaffolding
ng generate --help                       # full schematic list
ng build --configuration production      # what CI runs
```

There is no e2e framework in this app — `ng e2e` is not configured. Backend e2e
lives in `../backend/test/` and runs on Testcontainers.

Full CLI documentation: <https://angular.dev/tools/cli>.
