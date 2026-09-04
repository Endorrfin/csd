// === ADDED: PR-D1 — standalone runner for the About registry seed.
// runSeeds() is wired into main.ts, which is local-only, so prod is seeded by
// invoking this script explicitly: `npm run seed:about-documents`.
// Idempotent — re-running it re-syncs metadata from the register. ===
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedAboutDocuments } from './seed-about-documents';
import { getDatabaseSslOptions } from './db-ssl';

config();

async function run(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'csd',
    // raw SQL only — no entity metadata needed
    entities: [],
    synchronize: false,
    // was `{ rejectUnauthorized: false }`. Run on demand against
    // production (`npm run seed:about-documents`). See db-ssl.ts.
    ssl: getDatabaseSslOptions(),
  });

  await ds.initialize();
  await seedAboutDocuments(ds);
  await ds.destroy();
}

run().catch((err) => {
  console.error('❌ About documents seed failed:', err);
  process.exit(1);
});
