# CLAUDE.md — ui (Angular 21 SSR)

Specific guidance for the `/ui` app. Repo-wide rules and personal style preferences live in `../CLAUDE.md` — read that first.

## Stack (verified against `package.json` / `angular.json`)

- **Angular 21.2** standalone components + signals + SSR (`@angular/ssr@^21.2.1`).
- **Builder:** `@angular/build:application` (`outputMode: "server"`, SSR entry `src/server.ts`, browser entry `src/main.ts`, server bootstrap `src/main.server.ts`).
- **TypeScript:** `~5.9.2`.
- **HTTP:** `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` — fetch backend, not XHR.
- **Hydration:** `provideClientHydration(withEventReplay())`.
- **i18n:** `@ngx-translate/core@^17` + `@ngx-translate/http-loader`. JSON files in `src/assets/i18n/{ua,en}.json`. Fallback `ua`; app boots with `ua` (see `app.ts`).
- **Rich text:** `ngx-quill@^30` + Quill 2 (CSS imported globally in `angular.json`).
- **Maps:** Leaflet + `leaflet.markercluster` (only `@types/leaflet*` are declared — runtime libs loaded as `allowedCommonJsDependencies`).
- **Icons:** `lucide-angular`.
- **Tests:** Vitest 4 via `@angular/build:unit-test` builder (`ng test`).
- **Lint:** ESLint 10 + `angular-eslint@21` + `typescript-eslint@8.56` + `eslint-plugin-prettier`.

## Layout

```
ui/
├── angular.json                    # one project "ui", scss styles, ssr enabled
├── lambda.mjs                      # ⚠ Lambda entry — at ui root, wraps app via serverless-http
├── ssr-lambda.mjs                  # legacy/alternative entry — current serverless.yml points to lambda.mjs
├── serverless.yml                  # service: csd-ssr, handler: lambda.handler
├── eslint.config.mjs
├── tsconfig.{json,app,spec}.json
└── src/
    ├── main.ts                     # browser bootstrap (App + appConfig)
    ├── main.server.ts              # SSR bootstrap (App + serverConfig)
    ├── server.ts                   # Express app for SSR; exports `app` for Lambda wrapper
    ├── environments/{environment,environment.prod}.ts   # apiUrl swap via fileReplacements (production config)
    ├── app/
    │   ├── app.ts                  # <app-root>: standalone, signals, ngx-translate init
    │   ├── app.config.ts           # providers (router, http+interceptor, hydration, translate)
    │   ├── app.config.server.ts    # mergeApplicationConfig(appConfig, serverConfig) + withRoutes(serverRoutes)
    │   ├── app.routes.ts           # public routes (loadComponent / loadChildren)
    │   ├── app.routes.server.ts    # per-path render mode (blog/:slug=Server, activity-map=Client, **=Server)
    │   ├── core/
    │   │   ├── services/api.service.ts      # baseUrl = environment.apiUrl + '/api'
    │   │   ├── services/auth.service.ts     # signal-based isLoggedIn / userRole / userEmail, JWT in localStorage
    │   │   ├── interceptors/auth.interceptor.ts
    │   │   └── guards/auth.guard.ts         # managerGuard / adminGuard / superAdminGuard / authGuard
    │   ├── layout/{header,footer}/
    │   ├── shared/
    │   │   ├── components/{carousel,location-selector,sticky-cta}/
    │   │   ├── config/quill.config.ts       # keep allowed tags in sync with backend SanitizeHtmlPipe
    │   │   ├── pipes/quill-html.pipe.ts
    │   │   ├── directives/fade-in-on-scroll.directive.ts
    │   │   └── services/location.service.ts # consumes src/assets/data/locations.json
    │   └── features/
    │       ├── home/   about/   blog/   contact/
    │       ├── activity-map/                # Leaflet, lazy children
    │       ├── cooperation/{procurement,vacancy,testimonial,complaint}/   # nested lazy children
    │       ├── needs/wash-form/
    │       ├── admin/                       # managerGuard on parent; sub-routes use adminGuard / superAdminGuard
    │       ├── login/ register/ forgot-password/ reset-password/
    │       └── partners/                    # ⚠ route currently commented out in app.routes.ts
    └── assets/{i18n,data}/
```

## Local dev

```bash
npm install
npm start                  # ng serve → http://localhost:4200
# Hits backend at environment.apiUrl + '/api' → http://localhost:3000/api
```

Backend (`npm run start:dev` in `/backend`) already CORS-allowlists `http://localhost:4200`.

## Build & SSR

```bash
npm run build              # @angular/build:application, production by default
                           # outputs:
                           #   dist/ui/browser/   ← hashed assets (cache 1y)  → S3
                           #   dist/ui/server/    ← server.mjs bundle         → Lambda
npm run watch              # dev build with --watch
npm run serve:ssr:ui       # run the SSR server locally on PORT (default 4000)
```

SSR contract:
- `src/server.ts` builds the Express `app`, mounts `express.static(browserDistFolder)` then a catch-all that calls `AngularNodeAppEngine.handle(req)`. It exports `{ app, reqHandler }` — `lambda.mjs` imports `{ app }` from `./dist/ui/server/server.mjs` and wraps it with `serverless-http`.
- `app.routes.server.ts` declares per-route render mode. **`activity-map`** is `RenderMode.Client` (Leaflet hard-depends on `window`) — don't change without verifying SSR doesn't crash.

## Conventions (verified against current code)

- **Standalone-only.** No `NgModule` anywhere. New components/directives/pipes go in `standalone: true` (default in Angular 21). Imports are declared on the component.
- **Signals over BehaviorSubject** for component/service state. `AuthService` is the reference example.
- **`inject()` not constructor DI** in services and standalone components. Matches `api.service.ts`, `auth.service.ts`, guards, interceptor.
- **Selector prefix `app-`**, kebab-case for components, camelCase for directives — enforced by `angular-eslint` rules in `eslint.config.mjs`. Lint will fail otherwise.
- **SCSS** for styles (`schematics.@schematics/angular:component.style: scss`).
- **Lazy-load every feature** via `loadComponent` / `loadChildren`. The router config never imports components eagerly.
- **All API calls through `ApiService`.** It prepends `/api`. If you ever need a raw `HttpClient.get(absoluteUrl)`, document why.
- **SSR-safety in browser-only code:**
  - `authInterceptor` and all `*Guard` functions check `isPlatformBrowser(inject(PLATFORM_ID))` before touching `localStorage` / `Router.navigate`. Replicate this pattern for any new browser-only code.
  - Server-side, guards return `true` to let SSR render; auth is enforced on the client after hydration. Don't treat guards as security — security is the backend's job.
- **Quill HTML** rendered via `quillHtml` pipe; server already sanitized the input. Keep `shared/config/quill.config.ts` aligned with `backend/src/common/pipes/sanitize-html.pipe.ts` allowed-tags list.
- **Translation:** use `| translate` pipe in templates; service for imperative use. Add new keys to **both** `ua.json` and `en.json`.

## Environments

- `src/environments/environment.ts` → `apiUrl: 'http://localhost:3000'` (dev default).
- `src/environments/environment.prod.ts` → `apiUrl: 'https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod'` (used in production via `fileReplacements`).
- There is **no** environment file for staging today.

## Testing

```bash
npm test           # ng test → @angular/build:unit-test (Vitest 4)
```

Specs colocate with code as `*.spec.ts`. Vitest runs under jsdom (declared in devDeps).

## Lint & format

```bash
npm run lint           # angular-eslint + typescript-eslint, includes templates (.html)
npm run lint:fix
npm run format         # prettier --write "src/**/*.{ts,html,scss}"
```

⚠ **Formatter inconsistency to be aware of:** `package.json` `format` script *does* run Prettier on `.html`, but `eslint.config.mjs` explicitly disables the `prettier/prettier` ESLint rule for `.html` files (with comment "Prettier must NOT format Angular templates"). Net effect: `npm run format` may reformat templates, but `npm run lint` won't complain either way. If a template reformat breaks Angular template syntax (e.g. control-flow `@if`), revert it and exclude that file rather than fighting Prettier.

Active rules to remember (`eslint.config.mjs`):
- Component selector `kebab-case`, attribute directive selector `camelCase`, both prefixed `app`.
- `@typescript-eslint/consistent-type-definitions: 'error'` — use `interface`, not `type`, for object shapes.
- `@typescript-eslint/no-explicit-any: 'warn'` — avoid `any`.
- A11y rules are warnings (`click-events-have-key-events`, `interactive-supports-focus`, `label-has-associated-control`) — tech debt, not blocking.

## Deploy (Serverless v4 for SSR + `aws s3 sync` for static)

- Static: `aws s3 sync dist/ui/browser/ s3://csd-fund-static/` with `Cache-Control: public, max-age=31536000, immutable` for hashed assets, `max-age=0, must-revalidate` for `*.html`.
- SSR Lambda: `serverless deploy --stage prod` → `csd-ssr-prod-ssr`. Handler `lambda.handler` from `lambda.mjs`.
- CloudFront: distribution `E3U465AMSVR9PN`, `/*` invalidation after each deploy.

Production budgets (`angular.json`): `initial` ≤ 500 kB warning / 1 MB error; per-component style ≤ 12 kB warning / 16 kB error. CI will warn — keep an eye on bundle size when adding deps.

## Don'ts

- **Don't use `localStorage`/`sessionStorage` directly** — always go through `isPlatformBrowser` checks (look at `auth.interceptor.ts` and `auth.service.ts`).
- **Don't add NgModules.** Project is fully standalone.
- **Don't add eager imports of route components.** Use `loadComponent`.
- **Don't reintroduce Karma/Jasmine.** Stack is Vitest now.
- **Don't change `activity-map`'s server route to `RenderMode.Server`** without proving Leaflet doesn't crash under SSR.
- **Don't bypass `ApiService`** to talk to the backend — interceptor & base URL stay centralized.
