import { DataSource } from 'typeorm';
import { seedEquipmentCatalog } from './seed-equipment';
// === ADDED: PR-D1 — About document registry (32 entries from the register) ===
import { seedAboutDocuments } from './seed-about-documents';

/**
 * Run all seed operations.
 * Call from main.ts after app.listen():
 *   await runSeeds(app.get(DataSource));
 *
 * Note: main.ts is local-only — in prod (lambda.ts) this never runs. The About
 * registry is therefore seeded on demand with `npm run seed:about-documents`.
 */
export async function runSeeds(dataSource: DataSource): Promise<void> {
  await seedEquipmentCatalog(dataSource);
  await seedAboutDocuments(dataSource);
}
