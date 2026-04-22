import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `phone` column to `complaints`.
 *
 * Rationale: the phone column was added to
 * `1777000000000-AddVacancyTestimonialComplaintTables` retroactively, after that
 * migration had already been applied. TypeORM doesn't re-run completed migrations,
 * so a separate migration is required to propagate the schema change to all
 * environments (local + RDS).
 */
export class AddPhoneToComplaints1777100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS keeps this idempotent — safe on DBs where the column may
    // already exist (e.g. if the previous migration did run with it included).
    await queryRunner.query(`
      ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "phone" VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "complaints" DROP COLUMN IF EXISTS "phone"
    `);
  }
}
