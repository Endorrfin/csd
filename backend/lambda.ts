// backend/lambda.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
} from 'aws-lambda';
import express from 'express';
import { AppModule } from './src/app.module';
import { assertRequiredEnv } from './src/common/assert-required-env';
// explicit CORS allowlist parsed from FRONTEND_URL (audit P0-1)
import { getFrontendOrigins } from './src/common/frontend-urls';
// Batch 1 — centralised security headers (helmet)
import { securityHeaders } from './src/common/security-headers';

// typed handler signature — serverless-express generics default to `any`,
// so we pin event/result types once here and stay type-safe downstream
type ApiHandler = (
  event: APIGatewayProxyEvent,
  context: Context,
  callback?: Callback<APIGatewayProxyResult>,
) => Promise<APIGatewayProxyResult>;

let cachedServer: ApiHandler | undefined;

async function bootstrap(): Promise<ApiHandler> {
  assertRequiredEnv();
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  // Batch 1 — security headers (helmet) registered before CORS/routing
  app.use(securityHeaders());

  // was `origin: process.env.FRONTEND_URL || '*'` + `credentials: true` —
  // an unset/empty env silently allowed any origin (audit P0-1). Now an explicit
  // allowlist; `credentials` dropped — auth is a Bearer header, no cookies in use.
  app.enableCors({
    origin: getFrontendOrigins(),
  });

  app.useGlobalPipes(
    // added forbidNonWhitelisted to match main.ts (audit P1 #8 — prod/local drift)
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // add global prefix to match main.ts
  app.setGlobalPrefix('api');

  await app.init();
  // tell the adapter which response content types to base64-encode
  // explicit generics + single boundary cast (return type narrows
  // `void | Promise<Result>` to `Promise<Result>`, which PROMISE mode guarantees)
  return serverlessExpress<APIGatewayProxyEvent, APIGatewayProxyResult>({
    app: expressApp,
    binarySettings: {
      contentTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
      ],
    },
  }) as ApiHandler;
}

// was `(event: any, context: any, callback: any)`
export const handler: ApiHandler = async (event, context, callback) => {
  // Reuse the bootstrap result across warm invocations
  cachedServer ??= await bootstrap();
  return cachedServer(event, context, callback);
};
