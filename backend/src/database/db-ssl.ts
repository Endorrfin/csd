// backend/src/database/db-ssl.ts
// Two places open the same database and both must agree, but before this file
// they each carried their own `{ rejectUnauthorized: false }` literal:
//   - src/database/data-source.ts — the TypeORM CLI DataSource, used by
//     `migration:show` / `migration:run` from .github/workflows/deploy.yml
//   - src/app.module.ts — the Nest runtime (local main.ts and Lambda alike)
// Fixing one and leaving the other would have been worse than not fixing at all,
// so the decision now lives here and both import it.
//
// WHY THIS MATTERS. The RDS parameter group already sets `rds.force_ssl = 1`, so
// the connection IS encrypted — that half was never the problem. What
// `rejectUnauthorized: false` did was skip certificate verification, meaning the
// client completed a TLS handshake with ANY server answering on that host:port.
// Encryption without verification stops passive eavesdropping and does nothing
// against an active man-in-the-middle. Since `csd-postgres` currently accepts
// 5432 from 0.0.0.0/0 (CONCERNS.md P0-5), that is not a theoretical gap.
//
// THE CA BUNDLE IS NOT COMMITTED HERE BY DEFAULT — see backend/certs/README.md
// for the download-and-verify command. It is a public AWS certificate and is
// safe to commit once its checksum has been verified against AWS documentation.

import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/** Default CA bundle location, relative to the package root. */
const DEFAULT_CA_PATH = 'certs/rds-ca-eu-central-1.pem';

/**
 * SSL options accepted by TypeORM's postgres driver.
 * `false` disables TLS entirely — correct for a local Homebrew/Docker Postgres,
 * which has no certificate to verify.
 */
export type DatabaseSslOptions =
  false | { rejectUnauthorized: true; ca: string };

/**
 * Package root.
 * In Lambda the deployment package is unpacked to $LAMBDA_TASK_ROOT (/var/task).
 * Everywhere else — ts-node locally, `npm run migration:run` on a GitHub runner —
 * the npm scripts run with backend/ as the working directory.
 */
function packageRoot(): string {
  return process.env.LAMBDA_TASK_ROOT ?? process.cwd();
}

function readCaBundle(): string {
  // An inline PEM wins over the file. Nothing sets this today; it exists so a
  // rotated AWS CA can be deployed through Lambda env vars or a GitHub secret
  // without waiting for a code change.
  const inline = process.env.DB_CA_BUNDLE?.trim();
  if (inline) {
    return inline;
  }

  const configured = process.env.DB_CA_BUNDLE_PATH?.trim() || DEFAULT_CA_PATH;
  const path = isAbsolute(configured)
    ? configured
    : join(packageRoot(), configured);

  let pem: string;
  try {
    pem = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      `Cannot read the AWS RDS CA bundle at ${path}, and DB_CA_BUNDLE is not set. ` +
        'Refusing to open an unverified TLS connection to the database. ' +
        'See backend/certs/README.md for the download command. ' +
        `Cause: ${(error as Error).message}`,
    );
  }

  if (!pem.includes('BEGIN CERTIFICATE')) {
    throw new Error(
      `The file at ${path} contains no PEM certificate. Re-download the bundle — ` +
        'see backend/certs/README.md.',
    );
  }

  return pem;
}

/**
 * TLS options for the RDS connection.
 *
 * Outside production TLS is off, matching a local Postgres.
 *
 * In production this fails fast rather than degrading: an unverified connection
 * is the exact condition this function exists to remove, so a missing bundle must
 * stop the boot instead of silently reinstating it. That is the same policy as
 * `common/assert-required-env.ts` — Lambda surfaces the throw as an init-phase
 * error and the cold start fails, which is what we want.
 *
 * @param nodeEnv Injectable for tests; defaults to process.env.NODE_ENV.
 */
export function getDatabaseSslOptions(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): DatabaseSslOptions {
  if (nodeEnv !== 'production') {
    return false;
  }

  return { rejectUnauthorized: true, ca: readCaBundle() };
}
