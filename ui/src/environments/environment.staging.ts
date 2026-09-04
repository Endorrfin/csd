// staging build target (P1-5).
// Selected by the `staging` configuration in angular.json, which is composed on
// top of `production` rather than inheriting from it — Angular has no config
// inheritance, so the build command is:
//
//   ng build --configuration production,staging
//
// `staging` therefore carries ONLY the fileReplacements; budgets and
// outputHashing keep coming from `production`.
//
// This file must never point at the prod API. The whole point of staging is a
// place where a bad migration or a routing change cannot reach real data. ===
import type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  // substituted in CI, never edited by hand. deploy-staging.yml reads
  // the `ServiceEndpoint` output of stack `csd-api-staging` - the same source the
  // backend smoke test already uses - and rewrites this line before `ng build`,
  // failing the run if the sentinel survives. A hand-written api id silently
  // points at a stale host the moment the REST API is recreated; the stack
  // output cannot. Consequence: a LOCAL `ng build --configuration
  // production,staging` produces a build with an unusable apiUrl. That is
  // intended - staging is built in CI only.
  apiUrl: '__STAGING_API_BASE__',
  // Cloudflare Turnstile TEST site key (always passes) — same as environment.ts.
  // The real prod site key is bound to www.csd-fund.org and would fail on the
  // staging CloudFront domain. Paired with an unset TURNSTILE_SECRET_KEY on the
  // staging backend, the guard stays in bypass mode. Consequence to be aware of:
  // Turnstile itself is NOT exercised on staging — it stays a prod-only path.
  turnstileSiteKey: '1x00000000000000000000AA',
  // keep in lockstep with environment.ts and environment.prod.ts (PR-W2).
  // The real gate is the backend env WINTERIZATION_HOUSEHOLD_ENABLED.
  winterizationHouseholdEnabled: false,
  // same CARTO key as prod, but the key is bound to csd-fund.org /
  // www.csd-fund.org / localhost and the staging host is NOT registered — tiles
  // here keep the "API KEY REQUIRED" watermark. Accepted trade-off, mirroring the
  // Turnstile decision above: a clean basemap stays a production-only path.
  // To remove it, reply to the CARTO key email and ask to add the staging host.
  cartoBasemapKey: 'cb1_2vtu_1_5e5755ebee6c3e3b73e9cd9c',
};
