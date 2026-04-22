import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds new enum values for procurement and vacancy lifecycle statuses.
 *
 * IMPORTANT: only ADD VALUE here, no data updates. PostgreSQL forbids using
 * a freshly-added enum value in the same transaction. The data remap of
 * legacy `closed` → terminal status lives in
 * RemapLegacyClosedStatuses1777200000001 which runs in its own transaction.
 *
 * About `closed`: PostgreSQL does not support ALTER TYPE ... DROP VALUE,
 * so the value remains in the DB enum. The TypeScript enum marks it as
 * @deprecated and the admin UI never offers it as a new selection.
 */
export class ExpandStatusEnums1777200000000 implements MigrationInterface {
  // Disables TypeORM's automatic transaction wrapper for this migration.
  // ALTER TYPE ... ADD VALUE works fine without a transaction; with one,
  // the new value cannot be used until the transaction commits — which
  // breaks the data-remap step in the next migration.
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Procurement: add new enum values (idempotent) ──
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'extended'`,
    );
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'evaluation'`,
    );
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'awarded'`,
    );
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'suspended'`,
    );
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
    await queryRunner.query(
      `ALTER TYPE "procurements_status_enum" ADD VALUE IF NOT EXISTS 'completed'`,
    );

    // ── Vacancy: add new enum values ──
    await queryRunner.query(
      `ALTER TYPE "vacancies_status_enum" ADD VALUE IF NOT EXISTS 'extended'`,
    );
    await queryRunner.query(
      `ALTER TYPE "vacancies_status_enum" ADD VALUE IF NOT EXISTS 'on_hold'`,
    );
    await queryRunner.query(
      `ALTER TYPE "vacancies_status_enum" ADD VALUE IF NOT EXISTS 'suspended'`,
    );
    await queryRunner.query(
      `ALTER TYPE "vacancies_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
    await queryRunner.query(
      `ALTER TYPE "vacancies_status_enum" ADD VALUE IF NOT EXISTS 'hired'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support ALTER TYPE ... DROP VALUE.
    // Down is a no-op for the enum changes themselves; the values remain
    // in the type but are unused by application code.
  }
}
