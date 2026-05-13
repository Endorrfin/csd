import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAboutTables1777500000000 implements MigrationInterface {
  name = 'AddAboutTables1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CHANGED: enum of predefined section keys (extensible without schema migration via admin UI;
    // adding a new key in the future requires a small ALTER TYPE migration)
    await queryRunner.query(`
      CREATE TYPE "about_section_key_enum" AS ENUM (
        'INTRO',
        'MISSION',
        'VISION',
        'VALUES',
        'DIRECTIONS',
        'KEY_FACTS',
        'RESULTS',
        'TEAM_INTRO',
        'CONTACTS_INTRO',
        'DOCUMENTS_INTRO'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "about_document_type_enum" AS ENUM (
        'POLICY',
        'PROCEDURE',
        'REGULATION',
        'CODE',
        'REPORT'
      )
    `);

    // CHANGED: about_sections table — one row per logical section on the About page
    await queryRunner.query(`
      CREATE TABLE "about_sections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" "about_section_key_enum" NOT NULL,
        "title_ua" character varying NOT NULL,
        "title_en" character varying NOT NULL,
        "content_ua" text,
        "content_en" text,
        "metadata" jsonb,
        "is_published" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_about_sections_key" UNIQUE ("key"),
        CONSTRAINT "PK_about_sections" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_about_sections_is_published"
      ON "about_sections" ("is_published")
    `);

    // CHANGED: about_documents table — registry of policies/procedures/etc. with optional PDF file
    await queryRunner.query(`
      CREATE TABLE "about_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title_ua" character varying NOT NULL,
        "title_en" character varying NOT NULL,
        "description_ua" text,
        "description_en" text,
        "document_type" "about_document_type_enum" NOT NULL DEFAULT 'POLICY',
        "file_url" character varying,
        "last_review_date" date,
        "version" character varying,
        "is_published" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_about_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_about_documents_is_published"
      ON "about_documents" ("is_published")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_about_documents_type"
      ON "about_documents" ("document_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_about_documents_type"`);
    await queryRunner.query(`DROP INDEX "IDX_about_documents_is_published"`);
    await queryRunner.query(`DROP TABLE "about_documents"`);
    await queryRunner.query(`DROP INDEX "IDX_about_sections_is_published"`);
    await queryRunner.query(`DROP TABLE "about_sections"`);
    await queryRunner.query(`DROP TYPE "about_document_type_enum"`);
    await queryRunner.query(`DROP TYPE "about_section_key_enum"`);
  }
}
