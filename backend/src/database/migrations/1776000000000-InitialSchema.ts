import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * === ADDED: baseline migration that captures the schema that previously
 * came from `synchronize: true` (now disabled). ===
 *
 * Tables: users, posts, pages, cooperation, equipment_categories,
 * equipment_items, partners. Everything else has its own migration.
 *
 * SELF-DETECTING:
 *   - Fresh DB (test/CI/new env): users table absent → full CREATE runs.
 *   - Existing DB (prod, dev with synchronize history): users present →
 *     migration returns early. TypeORM still records it in the `migrations`
 *     table so the deploy pipeline proceeds without manual intervention.
 *
 * Run `npm run verify:prod-baseline` against prod BEFORE merging this PR to
 * confirm the live schema matches what fresh-DB code would create — that's
 * the only way to know the self-detect path is safe.
 */
export class InitialSchema1776000000000 implements MigrationInterface {
  name = 'InitialSchema1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === Self-detect: skip on already-populated databases ===
    // Why `users`: it's the oldest foundational table; if it exists, the
    // rest of the baseline tables almost certainly do too (validated by
    // verify:prod-baseline). If it doesn't exist, we know this is a fresh
    // bootstrap and proceed to create everything.
    const probe = (await queryRunner.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'users'
       ) AS exists`,
    )) as Array<{ exists: boolean }>;
    if (probe[0]?.exists) {
      console.log(
        '[InitialSchema1776000000000] users table already exists — ' +
          'recording baseline as applied without re-creating schema (back-fill mode)',
      );
      return;
    }

    // uuid_generate_v4() — relied on by every subsequent migration.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── users ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('public', 'manager', 'admin', 'donor', 'super_admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'public',
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "resetToken" character varying,
        "resetTokenExpiry" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )`,
    );

    // ── pages ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "pages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "titleUa" character varying NOT NULL,
        "titleEn" character varying NOT NULL,
        "contentUa" text NOT NULL,
        "contentEn" text NOT NULL,
        "isPublished" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pages_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_pages" PRIMARY KEY ("id")
      )`,
    );

    // ── posts (blog) ────────────────────────────────────────────────────
    // NOTE: `isFeatured` intentionally NOT in baseline — added by
    // 1777400000000-AddIsFeaturedToPosts.ts.
    await queryRunner.query(
      `CREATE TABLE "posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "titleUa" character varying NOT NULL,
        "titleEn" character varying NOT NULL,
        "contentUa" text NOT NULL,
        "contentEn" text NOT NULL,
        "excerptUa" text,
        "excerptEn" text,
        "category" character varying NOT NULL DEFAULT 'news',
        "coverImage" character varying,
        "images" jsonb NOT NULL DEFAULT '[]',
        "videoUrl" character varying,
        "isPublished" boolean NOT NULL DEFAULT true,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "authorId" uuid,
        CONSTRAINT "UQ_posts_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_posts" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts"
       ADD CONSTRAINT "FK_posts_author"
       FOREIGN KEY ("authorId") REFERENCES "users"("id")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // ── cooperation ────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."cooperation_type_enum" AS ENUM('vacancy', 'tender', 'initiative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cooperation_status_enum" AS ENUM('open', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cooperation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."cooperation_type_enum" NOT NULL,
        "status" "public"."cooperation_status_enum" NOT NULL DEFAULT 'open',
        "titleUa" character varying NOT NULL,
        "titleEn" character varying NOT NULL,
        "descriptionUa" text NOT NULL,
        "descriptionEn" text NOT NULL,
        "requirementsUa" text,
        "requirementsEn" text,
        "location" character varying,
        "deadline" TIMESTAMP WITH TIME ZONE,
        "contactEmail" character varying,
        "isPublished" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cooperation" PRIMARY KEY ("id")
      )`,
    );

    // ── partners ───────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."partners_type_enum" AS ENUM('donor', 'partner', 'government')`,
    );
    await queryRunner.query(
      `CREATE TABLE "partners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nameUa" character varying NOT NULL,
        "nameEn" character varying NOT NULL,
        "descriptionUa" text,
        "descriptionEn" text,
        "type" "public"."partners_type_enum" NOT NULL DEFAULT 'partner',
        "logoUrl" character varying,
        "websiteUrl" character varying,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partners" PRIMARY KEY ("id")
      )`,
    );

    // ── equipment catalog ───────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "equipment_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "nameEn" character varying NOT NULL,
        "nameUa" character varying NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_equipment_categories_code" UNIQUE ("code"),
        CONSTRAINT "PK_equipment_categories" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."equipment_items_unit_enum" AS ENUM('pcs', 'meters', 'kg')`,
    );
    await queryRunner.query(
      `CREATE TABLE "equipment_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ltaCode" integer NOT NULL,
        "nameEn" character varying NOT NULL,
        "nameUa" character varying NOT NULL,
        "unit" "public"."equipment_items_unit_enum" NOT NULL DEFAULT 'pcs',
        "specifications" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "categoryId" uuid NOT NULL,
        CONSTRAINT "UQ_equipment_items_ltaCode" UNIQUE ("ltaCode"),
        CONSTRAINT "PK_equipment_items" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "equipment_items"
       ADD CONSTRAINT "FK_equipment_items_category"
       FOREIGN KEY ("categoryId") REFERENCES "equipment_categories"("id")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // FKs first
    await queryRunner.query(
      `ALTER TABLE "equipment_items" DROP CONSTRAINT IF EXISTS "FK_equipment_items_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_posts_author"`,
    );

    // Tables (reverse order)
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_items"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."equipment_items_unit_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "equipment_categories"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "partners"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."partners_type_enum"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "cooperation"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."cooperation_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."cooperation_type_enum"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pages"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);

    // uuid-ossp intentionally NOT dropped — other databases on the cluster
    // may depend on it.
  }
}
