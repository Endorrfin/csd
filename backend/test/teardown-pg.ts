// === ADDED: Jest globalTeardown — stops the PG container started in setup-pg.ts ===
//
// Testcontainers' Ryuk would clean orphans automatically, but explicit stop
// reclaims the port immediately and avoids a noisy log line at process exit.

import { rmSync } from 'node:fs';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PG_INFO_FILE } from './setup-pg';

declare global {
  var __CSD_PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const container = globalThis.__CSD_PG_CONTAINER__;
  if (container) {
    await container.stop({ timeout: 5_000, remove: true });
  }
  try {
    rmSync(PG_INFO_FILE, { force: true });
  } catch {
    // best-effort cleanup
  }
}
