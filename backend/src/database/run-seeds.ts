import { DataSource } from 'typeorm';
import { seedEquipmentCatalog } from './seed-equipment';

/**
 * Run all seed operations.
 * Call from main.ts after app.listen():
 *   await runSeeds(app.get(DataSource));
 */
export async function runSeeds(dataSource: DataSource): Promise<void> {
  await seedEquipmentCatalog(dataSource);
}
