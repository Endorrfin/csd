import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcurementTable1776392248611 implements MigrationInterface {
  name = 'AddProcurementTable1776392248611';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."procurements_donor_enum" AS ENUM('UNICEF', 'UHF', 'GIZ', 'LDS', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."procurements_procurementmethod_enum" AS ENUM('open_tender', 'rfq', 'rfp')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."procurements_procurementcategory_enum" AS ENUM('goods', 'works', 'services')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."procurements_lotstructure_enum" AS ENUM('single', 'multiple')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."procurements_status_enum" AS ENUM('draft', 'published', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "procurements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenderTitleUa" character varying NOT NULL, "tenderTitleEn" character varying NOT NULL, "referenceNumber" character varying, "donor" "public"."procurements_donor_enum", "projectName" character varying, "projectCode" character varying, "implementingOrganization" character varying, "procurementMethod" "public"."procurements_procurementmethod_enum", "procurementCategory" "public"."procurements_procurementcategory_enum", "lotStructure" "public"."procurements_lotstructure_enum" NOT NULL DEFAULT 'single', "shortDescriptionUa" text, "shortDescriptionEn" text, "detailedDescriptionUa" text, "detailedDescriptionEn" text, "region" character varying, "communities" jsonb, "implementationPeriodDays" integer, "technicalDocuments" jsonb, "publicationDate" TIMESTAMP WITH TIME ZONE, "clarificationDeadline" TIMESTAMP WITH TIME ZONE, "bidSubmissionDeadline" TIMESTAMP WITH TIME ZONE, "expectedStartDate" TIMESTAMP WITH TIME ZONE, "submissionMethods" jsonb, "submissionEmail" character varying, "submissionLanguages" jsonb, "fileRequirements" character varying, "evaluationMethod" character varying, "evaluationCriteria" jsonb, "eligibilityRequirements" jsonb, "complianceChecks" jsonb, "attachments" jsonb, "status" "public"."procurements_status_enum" NOT NULL DEFAULT 'draft', "created_by_id" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af0852935077e606571f906d7ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurements" ADD CONSTRAINT "FK_1b70f851ec331a27a3741eb903d" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "procurements" DROP CONSTRAINT "FK_1b70f851ec331a27a3741eb903d"`,
    );
    await queryRunner.query(`DROP TABLE "procurements"`);
    await queryRunner.query(`DROP TYPE "public"."procurements_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."procurements_lotstructure_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."procurements_procurementcategory_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."procurements_procurementmethod_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."procurements_donor_enum"`);
  }
}
