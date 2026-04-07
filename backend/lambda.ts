// backend/src/lambda.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { AppModule } from './src/app.module';

let cachedServer: any;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: any, context: any, callback: any) => {
  // Reuse the bootstrap result across warm invocations
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback);
};
