import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVacancyTestimonialComplaintTables1777000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──
    await queryRunner.query(`
      CREATE TYPE "vacancies_employmenttype_enum" AS ENUM ('full_time', 'part_time', 'volunteer')
    `);
    await queryRunner.query(`
      CREATE TYPE "vacancies_status_enum" AS ENUM ('draft', 'published', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "testimonials_status_enum" AS ENUM ('pending', 'approved', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TYPE "complaints_category_enum" AS ENUM ('service_quality', 'staff_behavior', 'corruption', 'delay', 'other')
    `);
    await queryRunner.query(`
      CREATE TYPE "complaints_status_enum" AS ENUM ('new', 'in_review', 'resolved', 'closed')
    `);

    // ── vacancies ──
    await queryRunner.query(`
      CREATE TABLE "vacancies" (
        "id"                  UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "titleUa"             VARCHAR           NOT NULL,
        "titleEn"             VARCHAR           NOT NULL,
        "descriptionUa"       TEXT              NOT NULL,
        "descriptionEn"       TEXT              NOT NULL,
        "requirementsUa"      TEXT,
        "requirementsEn"      TEXT,
        "employmentType"      "vacancies_employmenttype_enum" NOT NULL,
        "region"              VARCHAR,
        "regionEn"            VARCHAR,
        "district"            VARCHAR,
        "districtEn"          VARCHAR,
        "community"           VARCHAR,
        "communityEn"         VARCHAR,
        "communityCode"       VARCHAR,
        "settlement"          VARCHAR,
        "settlementEn"        VARCHAR,
        "settlementCode"      VARCHAR,
        "applicationDeadline" TIMESTAMPTZ,
        "salary"              VARCHAR,
        "status"              "vacancies_status_enum" NOT NULL DEFAULT 'draft',
        "publishedAt"         TIMESTAMPTZ,
        "created_by_id"       VARCHAR,
        "createdAt"           TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vacancies" PRIMARY KEY ("id")
      )
    `);

    // ── testimonials ──
    await queryRunner.query(`
      CREATE TABLE "testimonials" (
        "id"            UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "authorName"    VARCHAR           NOT NULL,
        "organization"  VARCHAR,
        "text"          TEXT              NOT NULL,
        "rating"        INTEGER,
        "photoUrl"      VARCHAR,
        "region"        VARCHAR,
        "regionEn"      VARCHAR,
        "district"      VARCHAR,
        "districtEn"    VARCHAR,
        "community"     VARCHAR,
        "communityEn"   VARCHAR,
        "communityCode" VARCHAR,
        "settlement"    VARCHAR,
        "settlementEn"  VARCHAR,
        "settlementCode" VARCHAR,
        "isVerified"    BOOLEAN           NOT NULL DEFAULT false,
        "status"        "testimonials_status_enum" NOT NULL DEFAULT 'pending',
        "publishedAt"   TIMESTAMPTZ,
        "managerNotes"  TEXT,
        "created_by_id" VARCHAR,
        "createdAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_testimonials" PRIMARY KEY ("id")
      )
    `);

    // ── complaints ──
    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id"                 UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "category"           "complaints_category_enum" NOT NULL,
        "description"        TEXT              NOT NULL,
        "email"              VARCHAR,
        "region"             VARCHAR,
        "regionEn"           VARCHAR,
        "district"           VARCHAR,
        "districtEn"         VARCHAR,
        "community"          VARCHAR,
        "communityEn"        VARCHAR,
        "communityCode"      VARCHAR,
        "settlement"         VARCHAR,
        "settlementEn"       VARCHAR,
        "settlementCode"     VARCHAR,
        "attachments"        JSONB,
        "expectedResolution" TEXT,
        "status"             "complaints_status_enum" NOT NULL DEFAULT 'new',
        "submittedAt"        TIMESTAMPTZ,
        "managerNotes"       TEXT,
        "createdAt"          TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_complaints" PRIMARY KEY ("id")
      )
    `);

    // add phone column to complaints table
    await queryRunner.query(`
      ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "phone" VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "complaints"`);
    await queryRunner.query(`DROP TABLE "testimonials"`);
    await queryRunner.query(`DROP TABLE "vacancies"`);
    await queryRunner.query(`DROP TYPE "complaints_status_enum"`);
    await queryRunner.query(`DROP TYPE "complaints_category_enum"`);
    await queryRunner.query(`DROP TYPE "testimonials_status_enum"`);
    await queryRunner.query(`DROP TYPE "vacancies_status_enum"`);
    await queryRunner.query(`DROP TYPE "vacancies_employmenttype_enum"`);
    await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN IF EXISTS "phone"`);
  }
}
