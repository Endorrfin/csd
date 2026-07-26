import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Winterization form («Підготовка до зими» / Winterization Needs Assessment) —
 * docs/forms/Winterization/implementation-plan.md §3.
 *
 *  - winterization_forms       — parent. Option fields are varchar/text[]
 *                                validated in DTOs, so adding a value needs no
 *                                ALTER TYPE migration.
 *  - winterization_form_needs  — need specification rows (FK CASCADE); the
 *                                budgeting bank (quantity × cluster reference
 *                                cost), counterpart of recovery_form_damages.
 *
 * Reuses the shared infrastructure created by AddRecoveryForms1777800000000 —
 * form_number_sequences (tracking letter 'W'), needs_form_attachments
 * (formType='winterization'), needs_form_audit_log and the
 * needs_form_status_enum type. Nothing shared is created or dropped here.
 *
 * Nullability follows the entity rule: a column is nullable when at least one
 * applicant type (ОМС / інституція / домогосподарство) does not collect it.
 * Per-type requirements are enforced by CreateWinterizationFormDto. The SADD
 * beneficiary counts and needCategories stay NOT NULL — WinterizationService
 * derives them for household applications.
 */
export class AddWinterizationForms1777900000000 implements MigrationInterface {
  name = 'AddWinterizationForms1777900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Parent: winterization_forms ──
    await queryRunner.query(`
      CREATE TABLE "winterization_forms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trackingNumber" character varying(20) NOT NULL,
        "applicantType" character varying(20) NOT NULL,

        "organizationName" character varying NOT NULL,
        "edrpou" character varying(8),

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
        "contactPosition" character varying,
        "phone" character varying NOT NULL,
        "email" character varying NOT NULL,
        "messenger" character varying(100),
        "altContactName" character varying(255),
        "altContactPhone" character varying(20),
        "website" character varying(500),

        "facilityName" character varying,
        "facilityKind" character varying(40),
        "facilityKindOther" character varying(255),
        "streetAddress" character varying(255),
        "heatingSource" character varying(30),
        "heatingSourceOther" character varying(255),
        "heatedArea" numeric(10,2),
        "backupPower" character varying(20),
        "buildingCondition" character varying(30),

        "populationTotal" integer,
        "settlementsCovered" integer,
        "frontlineStatus" character varying(20),
        "targetFacilities" text,

        "needCategories" text[] NOT NULL,
        "needCategoryOther" character varying(500),
        "situationDescription" text,
        "solidFuelBoilerCount" integer,
        "solidFuelStorageAvailable" boolean,
        "heatingRepairDescription" text,
        "resiliencePointStatus" character varying(20),
        "resiliencePointCapacity" integer,
        "liquidFuelMonthsNeeded" integer,

        "directBeneficiaries" integer NOT NULL,
        "idpCount" integer NOT NULL,
        "childrenCount" integer NOT NULL,
        "pwdCount" integer NOT NULL,
        "elderlyCount" integer NOT NULL,
        "femaleCount" integer,
        "maleCount" integer,
        "indirectBeneficiaries" integer,
        "staffCount" integer,

        "needBy" character varying(20) NOT NULL,
        "urgency" character varying(20) NOT NULL,
        "estimatedCost" numeric(14,2),
        "costBasis" character varying(30),
        "otherDonors" boolean NOT NULL,
        "otherDonorsDetails" text,
        "cofinancing" character varying(10),
        "cofinancingDetails" character varying(255),
        "logistics" text[],
        "docsAvailable" text[],
        "cloudLink" character varying(500),

        "hhStreetAddress" character varying(255),
        "hhHouseNumber" character varying(50),
        "hhVulnerabilities" text[],
        "hhAdults" integer,
        "hhChildren" integer,
        "hhElderly" integer,
        "hhPwd" integer,
        "hhHeatingType" character varying(20),
        "hhHeatingTypeOther" character varying(255),
        "hhCriticalNeed" character varying(30),

        "status" "public"."needs_form_status_enum" NOT NULL DEFAULT 'new',
        "managerNotes" text,
        "consentGiven" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_winterization_forms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_winterization_forms_trackingNumber" UNIQUE ("trackingNumber")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_status" ON "winterization_forms" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_region" ON "winterization_forms" ("region")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_applicantType" ON "winterization_forms" ("applicantType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_facilityKind" ON "winterization_forms" ("facilityKind")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_urgency" ON "winterization_forms" ("urgency")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_createdAt" ON "winterization_forms" ("createdAt")`,
    );
    // GIN over the text[] column — the admin "filter by need category" query
    // uses `"needCategories" @> ARRAY[$1]`, which is GIN-indexable
    // (`$1 = ANY(...)` would not be).
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_forms_needCategories" ON "winterization_forms" USING GIN ("needCategories")`,
    );

    // ── 2. Child: winterization_form_needs ──
    await queryRunner.query(`
      CREATE TABLE "winterization_form_needs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "winterizationFormId" uuid NOT NULL,
        "category" character varying(40) NOT NULL,
        "item" character varying(40) NOT NULL,
        "quantity" numeric(12,2),
        "unit" character varying(10),
        "powerKw" numeric(8,2),
        "fuelType" character varying(20),
        "purpose" character varying(30),
        "details" character varying(500),
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_winterization_form_needs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_winterization_form_needs_form" FOREIGN KEY ("winterizationFormId")
          REFERENCES "winterization_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_winterization_form_needs_form" ON "winterization_form_needs" ("winterizationFormId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Child first, then parent. The shared tables and needs_form_status_enum are
    // owned by AddRecoveryForms1777800000000 and intentionally left untouched.
    await queryRunner.query(`DROP TABLE IF EXISTS "winterization_form_needs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "winterization_forms"`);
  }
}
