// backend/src/common/assert-required-env.ts
// fail-fast validation of required env vars at app bootstrap.
//
// Called from both src/main.ts (local dev) and backend/lambda.ts (production)
// at the very start of bootstrap(), BEFORE NestFactory.create(). Refuses to
// start the app with missing or obviously-weak secrets, rather than failing
// on the first user request with a cryptic JWT error.

// FRONTEND_URL validation in production (audit P0-1). An empty value
// used to silently fall back to CORS origin '*' in lambda.ts.
import { getFrontendOrigins } from './frontend-urls';

/**
 * Throws if a required env var is missing or fails a basic strength check.
 * Throwing (vs `process.exit`) lets the host runtime decide:
 *  - Local `node`/`ts-node` surfaces it as an unhandled rejection (exit code 1).
 *  - AWS Lambda surfaces it as an init-phase error and the cold-start fails,
 *    which is exactly what we want — Lambda will retry on a new container.
 */
export function assertRequiredEnv(): void {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET is required but missing. ' +
        'See backend/.env.example for the generation command (openssl rand -hex 32).',
    );
  }

  if (jwtSecret.length < 32) {
    throw new Error(
      `JWT_SECRET is too short (${jwtSecret.length} chars). ` +
        'Minimum 32 chars; recommended 64 (256-bit hex). ' +
        'Generate with: openssl rand -hex 32',
    );
  }

  // in production the CORS allowlist must be explicit — no '*' fallback.
  if (process.env.NODE_ENV === 'production') {
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl || frontendUrl.trim().length === 0) {
      throw new Error(
        'FRONTEND_URL is required in production (comma-separated CORS allowlist, ' +
          'canonical origin first), e.g. "https://www.csd-fund.org,https://csd-fund.org". ' +
          'Refusing to start with an implicit wildcard origin.',
      );
    }

    const insecureOrigins = getFrontendOrigins().filter(
      (origin) => !origin.startsWith('https://'),
    );
    if (insecureOrigins.length > 0) {
      throw new Error(
        `FRONTEND_URL contains non-HTTPS origins in production: ${insecureOrigins.join(', ')}`,
      );
    }
  }
}
