import type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod',
  // REAL Cloudflare Turnstile SITE key (public, safe to commit). Must pair with the TURNSTILE_SECRET_KEY GitHub secret.
  turnstileSiteKey: '0x4AAAAAAD6hWkWqejU3bzrN',
  // PR-W2 — keep in lockstep with environment.ts. Enabling the
  // household scenario is a management decision (tax-reporting duties for
  // direct assistance to individuals) and requires the backend env
  // WINTERIZATION_HOUSEHOLD_ENABLED=true as well.
  winterizationHouseholdEnabled: false,
  // CARTO began requiring an API key on the legacy raster basemap
  // endpoint in 08/2026 — without it every tile PNG carries an "API KEY REQUIRED"
  // watermark. Public key, bound to csd-fund.org / www.csd-fund.org / localhost.
  // This line is load-bearing: a missing key does NOT fail the build (TypeScript
  // checks against environment.ts, fileReplacements swaps the file afterwards),
  // it silently ships `?key=undefined` and the watermark comes back on prod.
  cartoBasemapKey: 'cb1_2vtu_1_5e5755ebee6c3e3b73e9cd9c',
};
