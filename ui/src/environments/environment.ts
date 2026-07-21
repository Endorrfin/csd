export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Cloudflare Turnstile SITE key (public). Dev uses CF's test
  // key (always passes, visible widget). The local backend bypasses Turnstile
  // when TURNSTILE_SECRET_KEY is unset, so any token is accepted in dev.
  turnstileSiteKey: '1x00000000000000000000AA',
};
