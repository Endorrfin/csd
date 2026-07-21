import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recovery form («Ремонт і відновлення соціальної інфраструктури») + shared
 * infrastructure for all future needs forms (implementation-plan §3):
 *
 *  - form_number_sequences   — per-(formType, year) tracking-number counter
 *  - needs_form_attachments  — polymorphic files (formType + formId, NO FK
 *                              by design: one table for every form type;
 *                              owning service deletes rows with the form)
 *  - needs_form_audit_log    — shared audit for NEW forms (WASH keeps its
 *                              own log; no FK to forms so entries survive
 *                              form deletion — better audit property)
 *  - needs_form_status_enum  — shared 6-value lifecycle (same as WASH)
 *  - recovery_forms          — parent (option fields are varchar/text[],
 *                              validated in DTOs — adding a value needs no
 *                              ALTER TYPE migration)
 *  - recovery_form_damages   — damaged-elements checklist (FK CASCADE)
 */
export class AddRecoveryForms1777800000000 implements MigrationInterface {
  name = 'AddRecoveryForms1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Shared: tracking-number sequences ──
    await queryRunner.query(`
      CREATE TABLE "form_number_sequences" (
        "formType" character varying(32) NOT NULL,
        "year" integer NOT NULL,
        "lastValue" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_form_number_sequences" PRIMARY KEY ("formType", "year")
      )
    `);

    // ── 2. Shared: polymorphic attachments ──
    await queryRunner.query(`
      CREATE TABLE "needs_form_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "formType" character varying(32) NOT NULL,
        "formId" uuid NOT NULL,
        "kind" character varying(16) NOT NULL,
        "s3Key" character varying(512) NOT NULL,
        "publicUrl" character varying(1000),
        "originalName" character varying(255) NOT NULL,
        "mimeType" character varying(100) NOT NULL,
        "sizeBytes" integer NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_needs_form_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_needs_form_attachments_form"
      ON "needs_form_attachments" ("formType", "formId")
    `);

    // ── 3. Shared: audit log for new needs forms ──
    await queryRunner.query(`
      CREATE TABLE "needs_form_audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "formType" character varying(32) NOT NULL,
        "formId" uuid NOT NULL,
        "changedById" uuid,
        "changedByEmail" character varying(255),
        "action" character varying(20) NOT NULL,
        "fieldName" character varying(100),
        "oldValue" text,
        "newValue" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_needs_form_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_needs_form_audit_log_user" FOREIGN KEY ("changedById")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_needs_form_audit_log_form"
      ON "needs_form_audit_log" ("formType", "formId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_needs_form_audit_log_created"
      ON "needs_form_audit_log" ("createdAt")
    `);

    // ── 4. Shared status enum (same 6 values as wash_forms_status_enum) ──
    await queryRunner.query(`
      CREATE TYPE "public"."needs_form_status_enum" AS ENUM(
        'new', 'in_review', 'approved', 'rejected', 'in_progress', 'completed'
      )
    `);

    // ── 5. Parent: recovery_forms ──
    await queryRunner.query(`
      CREATE TABLE "recovery_forms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trackingNumber" character varying(20) NOT NULL,

        "applicantCategory" character varying(40) NOT NULL,
        "applicantCategoryOther" character varying(255),
        "organizationName" character varying NOT NULL,

        "region" character varying NOT NULL,
        "regionEn" character varying NOT NULL DEFAULT '',
        "district" character varying NOT NULL DEFAULT '',
        "districtEn" character varying NOT NULL DEFAULT '',
        "community" character varying NOT NULL DEFAULT '',
        "communityEn" character varying NOT NULL DEFAULT '',
        "communityCode" character varying NOT NULL DEFAULT '',
        "settlement" character varying,
        "settlementEn" character varying,
        "settlementCode" character varying,

        "contactName" character varying NOT NULL,
        "contactPosition" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "email" character varying NOT NULL,
        "messenger" character varying(100),
        "altContactName" character varying(255),
        "altContactPhone" character varying(20),
        "website" character varying(500),

        "objectName" character varying NOT NULL,
        "objectType" character varying(40) NOT NULL,
        "objectTypeOther" character varying(255),
        "streetAddress" character varying(255),
        "ownershipType" character varying(20),
        "ownershipTypeOther" character varying(255),
        "onApplicantBalance" boolean,
        "buildYear" integer,
        "totalArea" numeric(10,2),
        "floors" integer,
        "workCategories" text[] NOT NULL,
        "damageDescription" text NOT NULL,
        "damageCause" character varying(40) NOT NULL,
        "damageCauseOther" character varying(255),
        "damageDate" character varying(7),
        "damageCategory" character varying(20) NOT NULL,
        "functioningStatus" character varying(30) NOT NULL,
        "accessibilityFeatures" text[],

        "educationMode" character varying(20),
        "shelterStatus" character varying(20),
        "shelterType" character varying(30),
        "shelterCapacity" integer,

        "healthFacilityKind" character varying(30),
        "suspendedServices" text,
        "declarationsCount" integer,

        "directBeneficiaries" integer NOT NULL,
        "idpCount" integer NOT NULL,
        "childrenCount" integer NOT NULL,
        "pwdCount" integer NOT NULL,
        "elderlyCount" integer NOT NULL,
        "femaleCount" integer,
        "maleCount" integer,
        "indirectBeneficiaries" integer,
        "staffCount" integer,
        "canOperateRemotely" character varying(20),

        "estimatedCost" numeric(14,2) NOT NULL,
        "costBasis" character varying(30) NOT NULL,
        "cofinancing" character varying(10) NOT NULL,
        "cofinancingDetails" character varying(255),
        "docsAvailable" text[] NOT NULL,
        "desiredTimeline" character varying(20),
        "urgency" character varying(30),
        "otherDonors" boolean NOT NULL,
        "otherDonorsDetails" text,
        "asbestosPresence" character varying(10) NOT NULL,
        "cloudLink" character varying(500),

        "status" "public"."needs_form_status_enum" NOT NULL DEFAULT 'new',
        "managerNotes" text,
        "consentGiven" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recovery_forms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_recovery_forms_trackingNumber" UNIQUE ("trackingNumber")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_forms_status" ON "recovery_forms" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_forms_region" ON "recovery_forms" ("region")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_forms_objectType" ON "recovery_forms" ("objectType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_forms_createdAt" ON "recovery_forms" ("createdAt")`,
    );

    // ── 6. Child: recovery_form_damages ──
    await queryRunner.query(`
      CREATE TABLE "recovery_form_damages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recoveryFormId" uuid NOT NULL,
        "element" character varying(30) NOT NULL,
        "volume" numeric(12,2),
        "unit" character varying(10),
        "notes" character varying(500),
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_recovery_form_damages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recovery_form_damages_form" FOREIGN KEY ("recoveryFormId")
          REFERENCES "recovery_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_recovery_form_damages_form" ON "recovery_form_damages" ("recoveryFormId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: children first, parent, then shared tables/types.
    await queryRunner.query(`DROP TABLE IF EXISTS "recovery_form_damages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recovery_forms"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."needs_form_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "needs_form_audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "needs_form_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "form_number_sequences"`);
  }
}
