import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestimonialEvidenceAndAssistance1777600000000 implements MigrationInterface {
  name = 'AddTestimonialEvidenceAndAssistance1777600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === assistance type enum (keep in sync with AssistanceType in testimonial.entity.ts) ===
    await queryRunner.query(`
      CREATE TYPE "testimonials_assistance_type_enum" AS ENUM (
        'borehole_drilling',
        'water_towers',
        'pipes_valves_fittings',
        'purification_system',
        'pumps_equipment',
        'water_tanks',
        'bottled_water',
        'hygiene_kits',
        'equipment',
        'wash_rehabilitation',
        'other'
      )
    `);

    // === evidence gallery (jsonb array of {url, name?}) ===
    await queryRunner.query(`
      ALTER TABLE "testimonials" ADD COLUMN "photos" jsonb
    `);

    // === multi-select assistance types ===
    await queryRunner.query(`
      ALTER TABLE "testimonials"
      ADD COLUMN "assistanceTypes" "testimonials_assistance_type_enum"[]
    `);

    // === free text used when 'other' is selected ===
    await queryRunner.query(`
      ALTER TABLE "testimonials" ADD COLUMN "assistanceTypeOther" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "testimonials" DROP COLUMN "assistanceTypeOther"`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonials" DROP COLUMN "assistanceTypes"`,
    );
    await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN "photos"`);
    await queryRunner.query(`DROP TYPE "testimonials_assistance_type_enum"`);
  }
}
