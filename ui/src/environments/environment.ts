import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Cloudflare Turnstile SITE key (public). Dev uses CF's test
  // key (always passes, visible widget). The local backend bypasses Turnstile
  // when TURNSTILE_SECRET_KEY is unset, so any token is accepted in dev.
  turnstileSiteKey: '1x00000000000000000000AA',
  // PR-W2 — Winterization «Домогосподарство / ФО» scenario. The card
  // renders disabled while this is false (implementation-plan §7). This is UX
  // only: the real gate is the backend env WINTERIZATION_HOUSEHOLD_ENABLED,
  // which answers 422 regardless of what the UI allows.
  winterizationHouseholdEnabled: false,

  // CARTO basemap key. Public and safe to commit — same class as the
  // Turnstile site key: it is domain-restricted and ships in the client bundle by
  // design. Do NOT proxy tiles through the SSR Lambda to hide it.
  // Registered domains: csd-fund.org, www.csd-fund.org, localhost.
  // Free fair-use limit: 5M tile requests / calendar month.
  // Keep in lockstep with environment.prod.ts and environment.staging.ts.
  cartoBasemapKey: 'cb1_2vtu_1_5e5755ebee6c3e3b73e9cd9c',
};
