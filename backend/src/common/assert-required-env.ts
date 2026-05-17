// backend/src/common/assert-required-env.ts
// === ADDED: fail-fast validation of required env vars at app bootstrap. ===
//
// Called from both src/main.ts (local dev) and backend/lambda.ts (production)
// at the very start of bootstrap(), BEFORE NestFactory.create(). Refuses to
// start the app with missing or obviously-weak secrets, rather than failing
// on the first user request with a cryptic JWT error.

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
}
