// === ADDED: Jest globalSetup — starts a real PG 16 container for e2e tests ===
//
// Lifecycle (per `npm run test:e2e` invocation):
//   1. Spin up `postgres:16-alpine` via Testcontainers (Ryuk handles orphan cleanup).
//   2. Build a one-off TypeORM DataSource against that container, apply ALL real
//      migrations from src/database/migrations. This validates the migration chain
//      on every test run — mock-DB strategies miss this and we've been burned by
//      migration drift in the past.
//   3. Persist connection info to a tmp JSON file. Each Jest worker reads this
//      in `setup-env.ts` BEFORE AppModule loads, so ConfigService sees real values.
//   4. Stash the container handle on globalThis so `teardown-pg.ts` can stop it
//      cleanly (Ryuk would clean it up anyway, but explicit is faster on CI).
//
// We do NOT rely on process.env propagation from globalSetup → worker processes;
// behavior varies across Jest versions. The tmp-file handshake is bulletproof.

import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export const PG_INFO_FILE = join(tmpdir(), 'csd-test-pg.json');

interface PgInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

// Re-declared in teardown-pg.ts; keep the key in sync.
declare global {
  var __CSD_PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const started = Date.now();

  console.log('\n[test:e2e] starting Postgres 16 container…');

  // generate the container password per run instead of hardcoding it.
  // The old literal ('csd_test') was flagged by GitGuardian as a Generic Password.
  // It was never a real credential — the container is ephemeral, bound to a
  // random localhost port and destroyed in teardown — but a credential-shaped
  // literal in git is worth avoiding on principle, and it keeps secret scanning
  // signal-to-noise high. Same reasoning as JWT_SECRET in setup-env.ts.
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('csd_test')
    .withUsername('csd_test')
    .withPassword(randomBytes(24).toString('hex'))
    .start();

  const info: PgInfo = {
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  };

  // Apply real migrations against the live container.
  const migrationDs = new DataSource({
    type: 'postgres',
    host: info.host,
    port: info.port,
    username: info.username,
    password: info.password,
    database: info.database,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    migrationsTransactionMode: 'each',
    synchronize: false,
  });

  await migrationDs.initialize();
  const applied = await migrationDs.runMigrations({ transaction: 'each' });
  await migrationDs.destroy();

  writeFileSync(PG_INFO_FILE, JSON.stringify(info), 'utf8');
  globalThis.__CSD_PG_CONTAINER__ = container;

  console.log(
    `[test:e2e] Postgres ready at ${info.host}:${info.port} ` +
      `(${applied.length} migrations applied, ${Date.now() - started}ms)`,
  );
}
