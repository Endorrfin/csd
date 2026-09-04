// the shape every environment file must satisfy.
//
// Why this exists. `angular.json` swaps environment.ts for environment.prod.ts /
// environment.staging.ts through `fileReplacements`, and that swap happens AFTER
// the import site has been resolved. Consumers import `environments/environment`,
// so TypeScript type-checks their property access against environment.ts alone —
// a key present there and missing from a replacement file compiled cleanly and
// shipped `undefined`. That is exactly how the CARTO basemap key could have
// reached production as `?key=undefined`, with no build error and no test
// failure: the only symptom would have been a watermark on the live map.
//
// Annotating all three files with this interface closes that hole. tsconfig.app
// includes `src/**/*.ts`, so all three are type-checked on every build — `ng
// serve`, `ng build`, `npm run verify` — and a missing or misspelled key fails
// the build locally, before CI, whichever configuration you are building.
//
// Adding a key means: declare it here, then add it to all three environment
// files. The compiler will not let you forget one.
//
// `readonly` throughout: nothing in the app assigns to `environment.*`, and a
// build-time constant that a component could mutate is a footgun, not a feature.
// The interface is imported with `import type`, so it is erased at compile time
// and adds nothing to the bundle.
export interface Environment {
  /** Angular's production flag. True for BOTH the prod and staging builds. */
  readonly production: boolean;

  /**
   * Backend API base URL. Called directly by the browser — it is not behind
   * CloudFront. In environment.staging.ts this is the `__STAGING_API_BASE__`
   * sentinel, which deploy-staging.yml substitutes from the `csd-api-staging`
   * stack output before `ng build`, failing the run if the sentinel survives.
   */
  readonly apiUrl: string;

  /**
   * Cloudflare Turnstile SITE key — public by design. Dev and staging use
   * Cloudflare's always-passing test key; the real key is bound to
   * www.csd-fund.org and must pair with the TURNSTILE_SECRET_KEY GitHub secret.
   */
  readonly turnstileSiteKey: string;

  /**
   * UX-only gate for the Winterization «Домогосподарство / ФО» scenario (PR-W2).
   * The real gate is the backend env WINTERIZATION_HOUSEHOLD_ENABLED, which
   * answers 422 regardless of what the UI allows. Keep the three files in sync.
   */
  readonly winterizationHouseholdEnabled: boolean;

  /**
   * CARTO basemap API key — public, restricted by referring domain
   * (csd-fund.org, www.csd-fund.org, localhost) rather than kept secret.
   * Required since 08/2026: without `?key=` every raster tile served from
   * basemaps.cartocdn.com is stamped with an "API KEY REQUIRED" watermark.
   */
  readonly cartoBasemapKey: string;
}
