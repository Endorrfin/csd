export const environment = {
  production: true,
  apiUrl: 'https://vzdw0zf80h.execute-api.eu-central-1.amazonaws.com/prod',
  // REAL Cloudflare Turnstile SITE key (public, safe to commit). Must pair with the TURNSTILE_SECRET_KEY GitHub secret.
  turnstileSiteKey: '0x4AAAAAAD6hWkWqejU3bzrN',
  // CHANGED: PR-W2 — keep in lockstep with environment.ts. Enabling the
  // household scenario is a management decision (tax-reporting duties for
  // direct assistance to individuals) and requires the backend env
  // WINTERIZATION_HOUSEHOLD_ENABLED=true as well.
  winterizationHouseholdEnabled: false,
};
