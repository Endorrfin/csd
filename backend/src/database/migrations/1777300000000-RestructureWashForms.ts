import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full WASH forms schema restructure.
 *
 * Why:
 *  - Old schema kept boreholeDrilling / waterTower / purificationSystem as
 *    JSONB single-object columns, limiting one of each per form.
 *  - New schema uses dedicated child tables so a form can hold N boreholes,
 *    N towers, N purifications, plus a brand-new `wash_form_pumps` table.
 *  - Adds `wash_form_audit_log` for change history.
 *
 * Data policy:
 *  - Existing 9 wash forms are dropped (user confirmed: CSV-exported first).
 *  - `equipment_categories` / `equipment_items` are untouched.
 *  - `users` / all other modules are untouched.
 *
 * Drop order: child tables first, then parent, then enums — avoids FK errors.
 */
export class RestructureWashForms1777300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Drop old wash-form tables (CASCADE covers any orphaned FKs) ──
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_forms" CASCADE`);

    // Old enum is auto-dropped with the table, but IF EXISTS makes it idempotent.
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_forms_status_enum"`,
    );

    // ── 2. Create enums ──
    await queryRunner.query(
      `CREATE TYPE "public"."wash_forms_status_enum" AS ENUM(
        'new', 'in_review', 'approved', 'rejected', 'in_progress', 'completed'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wash_form_boreholes_worktype_enum" AS ENUM(
        'new_drilling', 'repair_cleaning', 'new_near_existing'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wash_form_towers_towertype_enum" AS ENUM(
        'vbr_15', 'vbr_25', 'vbr_50', 'vbr_over_50'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wash_form_towers_towerheight_enum" AS ENUM(
        '8', '10', '12', '15', '18', '20', '25', 'over_25'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wash_form_pumps_purpose_enum" AS ENUM(
        'borehole', 'surface', 'drainage_sewage', 'other'
      )`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wash_form_audit_log_action_enum" AS ENUM(
        'created', 'updated', 'status_changed', 'deleted'
      )`,
    );

    // ── 3. Parent table: wash_forms ──
    await queryRunner.query(`
      CREATE TABLE "wash_forms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
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
        "organizationName" character varying NOT NULL,
        "headName" character varying NOT NULL,
        "headPhone" character varying NOT NULL,
        "email" character varying NOT NULL,
        "objectName" character varying NOT NULL,
        "dependentPopulation" integer NOT NULL,
        "socialFacilities" text,
        "installationDeadline" character varying,
        "replacementReason" text NOT NULL,
        "status" "public"."wash_forms_status_enum" NOT NULL DEFAULT 'new',
        "managerNotes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wash_forms" PRIMARY KEY ("id")
      )
    `);

    // ── 4. wash_form_boreholes ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_boreholes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "workType" "public"."wash_form_boreholes_worktype_enum" NOT NULL,
        "expectedFlowRate" integer NOT NULL,
        "hasAquiferInfo" boolean,
        "existingDepth" integer,
        "existingDebit" integer,
        "hasDesignInfo" boolean,
        "hasPassport" boolean,
        "oldLocation" text,
        "notes" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wash_form_boreholes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_boreholes_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_boreholes_form" ON "wash_form_boreholes" ("washFormId")`,
    );

    // ── 5. wash_form_towers ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_towers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "towerType" "public"."wash_form_towers_towertype_enum" NOT NULL,
        "towerHeight" "public"."wash_form_towers_towerheight_enum" NOT NULL,
        "customHeight" integer,
        "hasFoundation" boolean NOT NULL DEFAULT false,
        "isFoundationSuitable" boolean NOT NULL DEFAULT false,
        "needsFoundationReconstruction" boolean NOT NULL DEFAULT false,
        "canSelfReconstruct" boolean NOT NULL DEFAULT false,
        "canProvideCrane" boolean NOT NULL DEFAULT false,
        "notes" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wash_form_towers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_towers_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_towers_form" ON "wash_form_towers" ("washFormId")`,
    );

    // ── 6. wash_form_purifications ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_purifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "hasRoom" boolean NOT NULL DEFAULT false,
        "hasTemperatureControl" boolean NOT NULL DEFAULT false,
        "hasWaterInletDrainage" boolean NOT NULL DEFAULT false,
        "hasPowerSupply" boolean NOT NULL DEFAULT false,
        "canMaintainSystem" boolean NOT NULL DEFAULT false,
        "willingToProvideWater" boolean NOT NULL DEFAULT false,
        "notes" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wash_form_purifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_purifications_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_purifications_form" ON "wash_form_purifications" ("washFormId")`,
    );

    // ── 7. wash_form_pumps (NEW) ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_pumps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "purpose" "public"."wash_form_pumps_purpose_enum" NOT NULL,
        "purposeOther" character varying(255),
        "brand" character varying(100),
        "model" character varying(255),
        "powerKw" numeric(10,2),
        "flowRateM3h" numeric(10,2),
        "headM" numeric(10,2),
        "diameterInches" numeric(5,2),
        "voltage" character varying(50),
        "phases" integer,
        "quantity" integer NOT NULL DEFAULT 1,
        "notes" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wash_form_pumps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_pumps_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_pumps_form" ON "wash_form_pumps" ("washFormId")`,
    );

    // ── 8. Recreate wash_form_items (with sortOrder now) ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "equipmentItemId" uuid NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "notes" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_wash_form_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_items_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_wash_form_items_equipment" FOREIGN KEY ("equipmentItemId")
          REFERENCES "equipment_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_items_form" ON "wash_form_items" ("washFormId")`,
    );

    // ── 9. wash_form_audit_log ──
    await queryRunner.query(`
      CREATE TABLE "wash_form_audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "washFormId" uuid NOT NULL,
        "changedById" uuid,
        "changedByEmail" character varying(255),
        "action" "public"."wash_form_audit_log_action_enum" NOT NULL,
        "fieldName" character varying(100),
        "oldValue" text,
        "newValue" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wash_form_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wash_form_audit_log_form" FOREIGN KEY ("washFormId")
          REFERENCES "wash_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_wash_form_audit_log_user" FOREIGN KEY ("changedById")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_audit_log_form" ON "wash_form_audit_log" ("washFormId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wash_form_audit_log_created" ON "wash_form_audit_log" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: children first, parent last, then enums.
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_audit_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_pumps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_purifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_towers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_form_boreholes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wash_forms"`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_form_audit_log_action_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_form_pumps_purpose_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_form_towers_towerheight_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_form_towers_towertype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_form_boreholes_worktype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wash_forms_status_enum"`,
    );
    // NOTE: down() does NOT restore the 9 original forms — user exported CSV
    // before up() ran. This is intentional.
  }
}
