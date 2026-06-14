// load .env BEFORE assertRequiredEnv() — ConfigModule loads dotenv
// only as part of Nest bootstrap, which is too late for pre-bootstrap checks.
// Lambda runtime sets env vars itself, so lambda.ts does NOT need this import.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { runSeeds } from './database/run-seeds';
import { assertRequiredEnv } from './common/assert-required-env';
// shared FRONTEND_URL parsing — same allowlist source as lambda.ts (audit P0-1)
import { getFrontendOrigins } from './common/frontend-urls';
// Batch 1 — centralised security headers (helmet)
import { securityHeaders } from './common/security-headers';

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);

  // Batch 1 — security headers (helmet) registered before CORS/routing
  app.use(securityHeaders());

  app.setGlobalPrefix('api');

  // CORS — allows the Angular dev server to access the API
  // allowlist from FRONTEND_URL (defaults to http://localhost:4200);
  // `credentials` dropped — auth is a Bearer header, no cookies in use (audit P0-1)
  app.enableCors({
    origin: getFrontendOrigins(),
  });

  // Global DTO validation — rejects requests with invalid data
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Automatic type conversion
    }),
  );
  await app.listen(process.env.PORT ?? 3000);

  // add: seed to the directory on first launch
  const dataSource = app.get(DataSource);
  await runSeeds(dataSource);
}
void bootstrap();
