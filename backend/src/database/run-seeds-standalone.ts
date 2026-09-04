import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { EquipmentCategory } from '../modules/equipment-catalog/entities/equipment-category.entity';
import { EquipmentItem } from '../modules/equipment-catalog/entities/equipment-item.entity';
import { seedEquipmentCatalog } from './seed-equipment';
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
    entities: [EquipmentCategory, EquipmentItem],
    synchronize: false,
    // synchronize: true, // initial create table RDS
    // was `{ rejectUnauthorized: false }`. See db-ssl.ts.
    ssl: getDatabaseSslOptions(),
  });

  await ds.initialize();
  await seedEquipmentCatalog(ds);
  await ds.destroy();
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
