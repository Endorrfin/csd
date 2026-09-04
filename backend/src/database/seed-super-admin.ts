// backend/src/database/seed-super-admin.ts
// CHANGED: removed hardcoded credential fallbacks (security fix).
//          The previous defaults are considered COMPROMISED — any super_admin
//          that was created with them must be rotated immediately via
//          `npm run seed:super-admin -- --rotate-password`.
//
// Run modes:
//   npm run seed:super-admin                       — create if missing, promote if exists; never silently change password
//   npm run seed:super-admin -- --rotate-password  — also reset password on an existing super_admin
//
// Required env vars (no defaults — script fails fast if missing):
//   SUPER_ADMIN_EMAIL
//   SUPER_ADMIN_PASSWORD  (≥16 chars, must include upper+lower+digit+symbol)
//
// Standalone — NOT part of the bootstrap chain in main.ts/runSeeds().

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { getDatabaseSslOptions } from './db-ssl';

config(); // load .env

function die(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

// helper returns `string` (not `string | undefined`) so type narrowing
// carries across function boundaries into seed().
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) die(`${name} is required (no default).`);
  return v;
}

const email = requireEnv('SUPER_ADMIN_EMAIL');
const password = requireEnv('SUPER_ADMIN_PASSWORD');
const rotatePassword = process.argv.includes('--rotate-password');

if (!isEmail(email)) die('SUPER_ADMIN_EMAIL is not a valid email.');
if (password.length < 16) {
  die('SUPER_ADMIN_PASSWORD must be at least 16 characters.');
}
if (
  !/[A-Z]/.test(password) ||
  !/[a-z]/.test(password) ||
  !/[0-9]/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  die(
    'SUPER_ADMIN_PASSWORD must contain uppercase, lowercase, digit, and symbol.',
  );
}
// =====================================================================

async function seed(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'csd',
    entities: [User],
    synchronize: false,
    // was `{ rejectUnauthorized: false }`. This script writes an
    // ADMIN CREDENTIAL to production RDS — of every connection in this repo it
    // is the one that must not be MITM-able. See db-ssl.ts.
    ssl: getDatabaseSslOptions(),
  });

  await ds.initialize();
  const repo = ds.getRepository(User);

  const existing = await repo.findOne({ where: { email } });
  // CHANGED: bcrypt rounds 10 → 12 (OWASP 2024+ recommendation for admin accounts)
  const passwordHash = await bcrypt.hash(password, 12);

  if (!existing) {
    await repo.save(
      repo.create({
        email,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      }),
    );
    // CHANGED: never log the password
    console.log(`✅ Created super_admin: ${email}`);
  } else if (rotatePassword) {
    await repo.update(existing.id, {
      passwordHash,
      role: UserRole.SUPER_ADMIN, // ensure role is correct even on rotation
    });
    console.log(`🔄 Rotated password for ${email}`);
  } else if (existing.role !== UserRole.SUPER_ADMIN) {
    await repo.update(existing.id, { role: UserRole.SUPER_ADMIN });
    console.log(
      `✅ Promoted ${email} from "${existing.role}" to super_admin (password unchanged — pass --rotate-password to also reset).`,
    );
  } else {
    console.log(
      `ℹ️  ${email} is already super_admin (password unchanged — pass --rotate-password to reset).`,
    );
  }

  await ds.destroy();
}

seed().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
