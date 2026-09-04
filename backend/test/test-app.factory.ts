// Factory that builds the full Nest app against the test PG container
//
// Mirrors src/main.ts bootstrap (global prefix + ValidationPipe) so e2e tests
// hit the SAME wiring as production. Anything skipped here is a test/prod
// divergence waiting to happen.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });

  // Same three lines as main.ts and lambda.ts. Without them e2e would exercise
  // ConsoleLogger, i.e. not the wiring that actually ships.
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // Must match src/main.ts — otherwise tests hit /foo while prod expects /api/foo.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource };
}

/**
 * Truncate every user table (CASCADE), restart identity sequences.
 * Faster than drop+recreate-schema; called from `afterEach` in tests
 * that mutate data. Migration history is preserved.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const rows: { tablename: string }[] = await dataSource.query<
    { tablename: string }[]
  >(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename != 'migrations'`,
  );

  if (rows.length === 0) return;

  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
