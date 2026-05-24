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

async function bootstrap() {
  assertRequiredEnv();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS — allows the Angular dev server to access the API
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
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
