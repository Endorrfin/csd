import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remaps legacy `closed` status to its new terminal equivalent.
 * Procurement: closed → completed
 * Vacancy:    closed → hired
 *
 * Runs in its own transaction so that the new enum values added by
 * ExpandStatusEnums1777200000000 are already committed and safe to use here.
 */
export class RemapLegacyClosedStatuses1777200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "procurements" SET status = 'completed' WHERE status = 'closed'`,
    );
    await queryRunner.query(
      `UPDATE "vacancies" SET status = 'hired' WHERE status = 'closed'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "procurements" SET status = 'closed' WHERE status = 'completed'`,
    );
    await queryRunner.query(
      `UPDATE "vacancies" SET status = 'closed' WHERE status = 'hired'`,
    );
  }
}
