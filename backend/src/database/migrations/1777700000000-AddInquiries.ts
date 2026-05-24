import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInquiries1777700000000 implements MigrationInterface {
  name = 'AddInquiries1777700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === enums (keep in sync with inquiry.entity.ts) ===
    await queryRunner.query(`
      CREATE TYPE "inquiries_reason_enum" AS ENUM (
        'partnership',
        'volunteering',
        'press',
        'general',
        'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "inquiries_messengertype_enum" AS ENUM (
        'telegram',
        'viber',
        'whatsapp',
        'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "inquiries_preferredlang_enum" AS ENUM ('ua', 'en')
    `);
    await queryRunner.query(`
      CREATE TYPE "inquiries_status_enum" AS ENUM (
        'new',
        'read',
        'replied',
        'archived'
      )
    `);

    // === contact-form submissions ===
    await queryRunner.query(`
      CREATE TABLE "inquiries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reason" "inquiries_reason_enum" NOT NULL,
        "reasonOther" character varying,
        "name" character varying,
        "email" character varying,
        "phone" character varying,
        "messengerType" "inquiries_messengertype_enum",
        "messengerHandle" character varying,
        "preferredLang" "inquiries_preferredlang_enum" NOT NULL,
        "message" text NOT NULL,
        "consent" boolean NOT NULL DEFAULT false,
        "status" "inquiries_status_enum" NOT NULL DEFAULT 'new',
        "managerNotes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inquiries_id" PRIMARY KEY ("id")
      )
    `);

    // Admin grid orders by createdAt DESC and filters by status
    await queryRunner.query(`
      CREATE INDEX "IDX_inquiries_status_createdAt"
      ON "inquiries" ("status", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_inquiries_status_createdAt"`);
    await queryRunner.query(`DROP TABLE "inquiries"`);
    await queryRunner.query(`DROP TYPE "inquiries_status_enum"`);
    await queryRunner.query(`DROP TYPE "inquiries_preferredlang_enum"`);
    await queryRunner.query(`DROP TYPE "inquiries_messengertype_enum"`);
    await queryRunner.query(`DROP TYPE "inquiries_reason_enum"`);
  }
}
