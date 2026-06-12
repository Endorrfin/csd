// backend/src/common/frontend-urls.ts
// single source of truth for FRONTEND_URL parsing (audit P0-1)
//
// FRONTEND_URL is a comma-separated origin allowlist, e.g.:
//   FRONTEND_URL=https://www.csd-fund.org,https://csd-fund.org
// The FIRST entry is the canonical public URL and is used to build
// user-facing links (password reset). All entries feed the CORS allowlist.
// Read via process.env (not ConfigService) so it is usable both before
// Nest bootstrap (lambda.ts) and inside services.

const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

/** Parse FRONTEND_URL into a CORS origin allowlist. Never returns an empty array. */
export function getFrontendOrigins(): string[] {
  const raw = process.env.FRONTEND_URL ?? '';
  const origins = raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, '')) // tolerate spaces and trailing slashes
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : [DEFAULT_FRONTEND_URL];
}

/** Canonical public URL (first allowlist entry) — for user-facing links, not CORS. */
export function getCanonicalFrontendUrl(): string {
  return getFrontendOrigins()[0];
}
