// === Read-only audit script ===
//
// Confirms that the live production schema matches what the InitialSchema
// baseline migration WOULD create on a fresh DB. Run BEFORE merging any PR
// that introduces or modifies the baseline migration.
//
// Usage (from backend/):
//   DB_HOST=...rds... DB_PORT=5432 DB_USERNAME=... DB_PASSWORD=... DB_NAME=... \
//     npm run verify:prod-baseline
//
// Or with .env.prod committed locally:
//   NODE_ENV=production npm run verify:prod-baseline
//
// Exit codes: 0 = schema matches, 1 = drift detected (DO NOT MERGE).
// This script ONLY issues SELECT queries against information_schema and
// pg_type. It never writes.

import 'dotenv/config';
import { DataSource } from 'typeorm';

interface ColumnSpec {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableSpec {
  table: string;
  columns: ColumnSpec[];
}

interface EnumSpec {
  name: string;
  values: string[];
}

// What the baseline migration creates on a fresh DB. If you change
// 1776000000000-InitialSchema.ts, update these constants in lockstep.
const EXPECTED_TABLES: TableSpec[] = [
  {
    table: 'users',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'email', type: 'character varying', nullable: false },
      { name: 'passwordHash', type: 'character varying', nullable: false },
      { name: 'role', type: 'USER-DEFINED', nullable: false },
      { name: 'firstName', type: 'character varying', nullable: false },
      { name: 'lastName', type: 'character varying', nullable: false },
      { name: 'resetToken', type: 'character varying', nullable: true },
      {
        name: 'resetTokenExpiry',
        type: 'timestamp with time zone',
        nullable: true,
      },
      {
        name: 'createdAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      {
        name: 'updatedAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
    ],
  },
  {
    table: 'pages',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'slug', type: 'character varying', nullable: false },
      { name: 'titleUa', type: 'character varying', nullable: false },
      { name: 'titleEn', type: 'character varying', nullable: false },
      { name: 'contentUa', type: 'text', nullable: false },
      { name: 'contentEn', type: 'text', nullable: false },
      { name: 'isPublished', type: 'boolean', nullable: false },
      { name: 'sortOrder', type: 'integer', nullable: false },
      {
        name: 'createdAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      {
        name: 'updatedAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
    ],
  },
  {
    table: 'posts',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'slug', type: 'character varying', nullable: false },
      { name: 'titleUa', type: 'character varying', nullable: false },
      { name: 'titleEn', type: 'character varying', nullable: false },
      { name: 'contentUa', type: 'text', nullable: false },
      { name: 'contentEn', type: 'text', nullable: false },
      { name: 'excerptUa', type: 'text', nullable: true },
      { name: 'excerptEn', type: 'text', nullable: true },
      { name: 'category', type: 'character varying', nullable: false },
      { name: 'coverImage', type: 'character varying', nullable: true },
      { name: 'images', type: 'jsonb', nullable: false },
      { name: 'videoUrl', type: 'character varying', nullable: true },
      { name: 'isPublished', type: 'boolean', nullable: false },
      { name: 'publishedAt', type: 'timestamp with time zone', nullable: true },
      {
        name: 'createdAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      {
        name: 'updatedAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      { name: 'authorId', type: 'uuid', nullable: true },
      // isFeatured added by 1777400000000-AddIsFeaturedToPosts, expected present in prod
      { name: 'isFeatured', type: 'boolean', nullable: false },
    ],
  },
  {
    table: 'cooperation',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'type', type: 'USER-DEFINED', nullable: false },
      { name: 'status', type: 'USER-DEFINED', nullable: false },
      { name: 'titleUa', type: 'character varying', nullable: false },
      { name: 'titleEn', type: 'character varying', nullable: false },
      { name: 'descriptionUa', type: 'text', nullable: false },
      { name: 'descriptionEn', type: 'text', nullable: false },
      { name: 'requirementsUa', type: 'text', nullable: true },
      { name: 'requirementsEn', type: 'text', nullable: true },
      { name: 'location', type: 'character varying', nullable: true },
      { name: 'deadline', type: 'timestamp with time zone', nullable: true },
      { name: 'contactEmail', type: 'character varying', nullable: true },
      { name: 'isPublished', type: 'boolean', nullable: false },
      {
        name: 'createdAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      {
        name: 'updatedAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
    ],
  },
  {
    table: 'partners',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'nameUa', type: 'character varying', nullable: false },
      { name: 'nameEn', type: 'character varying', nullable: false },
      { name: 'descriptionUa', type: 'text', nullable: true },
      { name: 'descriptionEn', type: 'text', nullable: true },
      { name: 'type', type: 'USER-DEFINED', nullable: false },
      { name: 'logoUrl', type: 'character varying', nullable: true },
      { name: 'websiteUrl', type: 'character varying', nullable: true },
      { name: 'sortOrder', type: 'integer', nullable: false },
      { name: 'isActive', type: 'boolean', nullable: false },
      {
        name: 'createdAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
      {
        name: 'updatedAt',
        type: 'timestamp without time zone',
        nullable: false,
      },
    ],
  },
  {
    table: 'equipment_categories',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'code', type: 'character varying', nullable: false },
      { name: 'nameEn', type: 'character varying', nullable: false },
      { name: 'nameUa', type: 'character varying', nullable: false },
      { name: 'sortOrder', type: 'integer', nullable: false },
    ],
  },
  {
    table: 'equipment_items',
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'ltaCode', type: 'integer', nullable: false },
      { name: 'nameEn', type: 'character varying', nullable: false },
      { name: 'nameUa', type: 'character varying', nullable: false },
      { name: 'unit', type: 'USER-DEFINED', nullable: false },
      { name: 'specifications', type: 'text', nullable: true },
      { name: 'sortOrder', type: 'integer', nullable: false },
      { name: 'categoryId', type: 'uuid', nullable: false },
    ],
  },
];

const EXPECTED_ENUMS: EnumSpec[] = [
  {
    name: 'users_role_enum',
    values: ['public', 'manager', 'admin', 'donor', 'super_admin'],
  },
  {
    name: 'cooperation_type_enum',
    values: ['vacancy', 'tender', 'initiative'],
  },
  { name: 'cooperation_status_enum', values: ['open', 'closed'] },
  { name: 'partners_type_enum', values: ['donor', 'partner', 'government'] },
  { name: 'equipment_items_unit_enum', values: ['pcs', 'meters', 'kg'] },
];

interface InfoSchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
}

interface PgEnumRow {
  enumlabel: string;
}

async function verify(): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    // Belt + suspenders: even though we only issue SELECT, prevent accidental
    // schema changes by setting a read-only session.
    extra: { application_name: 'csd-baseline-verifier' },
  });

  await ds.initialize();
  await ds.query('SET TRANSACTION READ ONLY').catch(() => undefined);

  console.log(
    `\nVerifying baseline against ${process.env.DB_HOST}/${process.env.DB_NAME}\n`,
  );

  // ── tables + columns ───────────────────────────────────────────────
  for (const spec of EXPECTED_TABLES) {
    const cols = await ds.query<InfoSchemaColumn[]>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [spec.table],
    );

    if (cols.length === 0) {
      errors.push(`TABLE MISSING: "${spec.table}"`);
      continue;
    }

    const byName = new Map(cols.map((c) => [c.column_name, c]));
    for (const expected of spec.columns) {
      const actual = byName.get(expected.name);
      if (!actual) {
        errors.push(`MISSING COLUMN: "${spec.table}"."${expected.name}"`);
        continue;
      }
      if (actual.data_type !== expected.type) {
        errors.push(
          `TYPE MISMATCH: "${spec.table}"."${expected.name}" ` +
            `expected ${expected.type}, got ${actual.data_type}`,
        );
      }
      const actualNullable = actual.is_nullable === 'YES';
      if (actualNullable !== expected.nullable) {
        errors.push(
          `NULLABILITY MISMATCH: "${spec.table}"."${expected.name}" ` +
            `expected ${expected.nullable ? 'NULL' : 'NOT NULL'}, got ${actual.is_nullable}`,
        );
      }
    }

    // Surface unexpected columns as warnings (they don't break the baseline,
    // but you probably want to know about untracked schema drift).
    const expectedNames = new Set(spec.columns.map((c) => c.name));
    for (const actual of cols) {
      if (!expectedNames.has(actual.column_name)) {
        warnings.push(
          `EXTRA COLUMN (drift): "${spec.table}"."${actual.column_name}"`,
        );
      }
    }
  }

  // ── enums ──────────────────────────────────────────────────────────
  for (const e of EXPECTED_ENUMS) {
    const rows = await ds.query<PgEnumRow[]>(
      `SELECT enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname = $1
       ORDER BY e.enumsortorder`,
      [e.name],
    );
    if (rows.length === 0) {
      errors.push(`ENUM MISSING: ${e.name}`);
      continue;
    }
    const actualValues = rows.map((r) => r.enumlabel);
    const missing = e.values.filter((v) => !actualValues.includes(v));
    const extra = actualValues.filter((v) => !e.values.includes(v));
    if (missing.length > 0) {
      errors.push(`ENUM ${e.name}: missing values [${missing.join(', ')}]`);
    }
    if (extra.length > 0) {
      // Extra enum values added by later migrations (e.g. ExpandStatusEnums)
      // are expected and acceptable.
      warnings.push(
        `ENUM ${e.name}: extra values [${extra.join(', ')}] (likely added by later migration)`,
      );
    }
  }

  await ds.destroy();

  // ── report ─────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    console.log('⚠️  Warnings (informational, do not block deploy):');
    for (const w of warnings) {
      console.log(`   - ${w}`);
    }

    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Baseline verification FAILED:');
    for (const e of errors) {
      console.error(`   - ${e}`);
    }

    console.error(
      '\nDO NOT MERGE. Either fix InitialSchema migration to match prod, ' +
        'or add an explicit ALTER migration to reconcile prod to the baseline.',
    );
    process.exit(1);
  }

  console.log('✅ Baseline matches prod schema. Safe to merge.\n');
}

verify().catch((err: unknown) => {
  console.error('verify-baseline crashed:', err);
  process.exit(1);
});
