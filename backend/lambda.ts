// backend/lambda.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
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
  /*
   * bufferLogs -> useLogger -> flushLogs, in that order, and all three are
   * load-bearing.
   *
   * `bufferLogs` holds the bootstrap messages until the logger is swapped in,
   * so they come out as JSON instead of as a second format in the same log
   * stream. Nest drains that buffer inside `app.listen()` only — and a Lambda
   * never calls it: this entry point runs `app.init()` and hands the Express
   * app to the adapter. Without `flushLogs()` the buffer stays attached for the
   * life of the container and every Nest log line is swallowed: the bootstrap
   * lines and, far worse, every runtime `new Logger().warn()` — the password
   * reset link (auth.service.ts) and all four TurnstileGuard warnings. Verified
   * against the built dist/lambda.js: nothing on stdout without it, everything
   * with it. `flushLogs()` is idempotent.
   */
  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.flushLogs();

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
