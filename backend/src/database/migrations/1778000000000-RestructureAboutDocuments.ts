import { MigrationInterface, QueryRunner } from 'typeorm';

// PR-D1 — restructure the About document registry:
//   1. document_type: pg enum → varchar (the register needs 9 types today and grows);
//   2. add code / access_mode / next_review_date, rename file_url → legacy_file_url;
//   3. add about_document_files (locale + version variants in the PRIVATE bucket).
export class RestructureAboutDocuments1778000000000 implements MigrationInterface {
  name = 'RestructureAboutDocuments1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. document_type: enum → varchar -----------------------------------
    // The default has to go first: Postgres cannot cast it together with the column.
    await queryRunner.query(
      `ALTER TABLE "about_documents" ALTER COLUMN "document_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents"
         ALTER COLUMN "document_type" TYPE character varying(32)
         USING "document_type"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents" ALTER COLUMN "document_type" SET DEFAULT 'POLICY'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "about_document_type_enum"`);

    // --- 2. registry columns -------------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "about_documents" ADD COLUMN IF NOT EXISTS "code" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents"
         ADD COLUMN IF NOT EXISTS "access_mode" character varying(32) NOT NULL
         DEFAULT 'view_only'`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents" ADD COLUMN IF NOT EXISTS "next_review_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents" RENAME COLUMN "file_url" TO "legacy_file_url"`,
    );

    // Rows created before the register have no code; give them a traceable
    // placeholder so UNIQUE NOT NULL can be applied without losing data.
    await queryRunner.query(
      `UPDATE "about_documents"
          SET "code" = 'LEGACY-' || upper(substr(replace("id"::text, '-', ''), 1, 8))
        WHERE "code" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_about_documents_code" ON "about_documents" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_about_documents_access_mode"
       ON "about_documents" ("access_mode")`,
    );

    // --- 3. about_document_files --------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "about_document_files" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "locale" character varying(5) NOT NULL,
        "version" character varying(20) NOT NULL,
        "effective_date" date,
        "s3_key" character varying(512) NOT NULL,
        "original_name" character varying(255) NOT NULL,
        "mime_type" character varying(128) NOT NULL DEFAULT 'application/pdf',
        "size_bytes" integer NOT NULL,
        "page_count" integer,
        "checksum_sha256" character varying(64),
        "is_current" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_about_document_files" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_about_document_files_version"
          UNIQUE ("document_id", "locale", "version"),
        CONSTRAINT "FK_about_document_files_document"
          FOREIGN KEY ("document_id") REFERENCES "about_documents" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_about_document_files_lookup"
      ON "about_document_files" ("document_id", "locale", "is_current")
    `);
    // The viewer must resolve exactly one row per document+locale — enforce it in
    // the database rather than trusting the admin UI to unset the previous file.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_about_document_files_current"
      ON "about_document_files" ("document_id", "locale")
      WHERE "is_current"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "about_document_files"`);
    await queryRunner.query(`DROP INDEX "IDX_about_documents_access_mode"`);
    await queryRunner.query(`DROP INDEX "UQ_about_documents_code"`);
    await queryRunner.query(
      `ALTER TABLE "about_documents" DROP COLUMN "next_review_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "about_documents" DROP COLUMN "access_mode"`,
    );
    await queryRunner.query(`ALTER TABLE "about_documents" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "about_documents" RENAME COLUMN "legacy_file_url" TO "file_url"`,
    );

    await queryRunner.query(`
      CREATE TYPE "about_document_type_enum" AS ENUM
        ('POLICY', 'PROCEDURE', 'REGULATION', 'CODE', 'REPORT')
    `);
    // Types introduced by PR-D1 have no representation in the old enum — collapse
    // them to POLICY so the revert cannot fail half-way through.
    await queryRunner.query(`
      UPDATE "about_documents" SET "document_type" = 'POLICY'
       WHERE "document_type" NOT IN
         ('POLICY', 'PROCEDURE', 'REGULATION', 'CODE', 'REPORT')
    `);
    await queryRunner.query(
      `ALTER TABLE "about_documents" ALTER COLUMN "document_type" DROP DEFAULT`,
    );
    await queryRunner.query(`
      ALTER TABLE "about_documents"
        ALTER COLUMN "document_type" TYPE "about_document_type_enum"
        USING "document_type"::"about_document_type_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "about_documents" ALTER COLUMN "document_type" SET DEFAULT 'POLICY'`,
    );
  }
}
