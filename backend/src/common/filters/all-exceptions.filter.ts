// backend/src/common/filters/all-exceptions.filter.ts
// Before this filter every controller fell through to Nest's default handler.
// Two things follow from that, and both are fixed here rather than by changing
// what clients see:
//
// 1. An unhandled error returned its own `message` to the caller. Nest masks
//    the message of a non-HttpException, but anything thrown as an
//    `InternalServerErrorException` reached the browser verbatim — including
//    `upload.service.ts`, which named an environment variable in the text.
// 2. Nothing correlated a failed response with a log line. The body now carries
//    the same `requestId` that every log line of the request carries, so a user
//    can quote it and it resolves to the exact request in Logs Insights.
//
// What is deliberately NOT changed: the shape Nest already produced.
// `statusCode`, `message` (string OR the string[] that ValidationPipe emits) and
// `error` are passed through untouched, because 44 places in the Angular app
// read `err.error?.message` and two of them branch on `Array.isArray`. Fields
// are only ADDED. Rewriting `message` here would break admin screens silently.
//
// Logging: this filter writes no log line of its own. It hands the error to
// `pino-http` through `res.err`, which already emits exactly one completion
// line per request carrying `requestId`, method, path, status and duration.
// A second line from here would duplicate all of that. For 5xx the real
// exception goes across, stack included; for 4xx only its type and message do,
// because a stack for a routine 401 or a validation 400 is pure noise. That is
// also why `nestjs-pino`'s own `LoggerErrorInterceptor` is not used: it attaches
// the exception for every status.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolveRequestId } from '../logger/request-id';

/** `req.id` is pino-http's correlation id; the declared type is too loose. */
type LoggedRequest = Request & { id?: unknown };

/**
 * pino-http declares `res.err` as `Error | undefined`, but it hands whatever it
 * finds there to the `err` serializer, and `stdSerializers.err` passes a
 * non-Error through untouched. Writing a plain object is therefore deliberate —
 * it is how a 4xx gets a type and a message into the log without a stack.
 */
function attachErrorForLogging(res: Response, value: unknown): void {
  (res as unknown as { err?: unknown }).err = value;
}

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId: string;
  timestamp: string;
  path: string;
}

const GENERIC_500_MESSAGE = 'Internal server error';
const GENERIC_500_ERROR = 'Internal Server Error';

/** `status` is a plain number here, so compare against one rather than the enum. */
const SERVER_ERROR_FROM = 500;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function readMessage(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') return value;
  if (isStringArray(value)) return value;
  return undefined;
}

/** `req.id` is set by pino-http; the fallback covers an error thrown before it. */
function readRequestId(req: LoggedRequest): string {
  return typeof req.id === 'string' && req.id.length > 0
    ? req.id
    : resolveRequestId();
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // No other transport exists in this app today. If one is ever added, its
    // errors keep the framework default instead of being silently swallowed.
    if (host.getType() !== 'http') throw exception;

    const http = host.switchToHttp();
    const req = http.getRequest<LoggedRequest>();
    const res = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Hand the error to pino-http before anything else can go wrong, so the
    // completion line carries it even if the response is already on its way.
    attachErrorForLogging(
      res,
      status >= SERVER_ERROR_FROM ? exception : summarise(exception, status),
    );

    // A response can already be streaming (binary XLSX export, an error raised
    // after the first chunk). Overwriting it would corrupt the download.
    if (res.headersSent) return;

    res.status(status).json(this.buildBody(exception, status, req));
  }

  private buildBody(
    exception: unknown,
    status: number,
    req: LoggedRequest,
  ): ErrorResponseBody {
    const base = {
      requestId: readRequestId(req),
      timestamp: new Date().toISOString(),
      // Path only: the query string is echoed back to the caller in no other
      // response, and it is what the admin search box types into.
      path: req.originalUrl.split('?')[0],
    };

    if (status >= SERVER_ERROR_FROM) {
      return {
        statusCode: status,
        message: GENERIC_500_MESSAGE,
        error: GENERIC_500_ERROR,
        ...base,
      };
    }

    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    if (typeof payload === 'string') {
      return { statusCode: status, message: payload, ...base };
    }

    const shape = payload as { message?: unknown; error?: unknown } | undefined;

    return {
      statusCode: status,
      message:
        readMessage(shape?.message) ??
        (exception instanceof HttpException ? exception.message : ''),
      ...(typeof shape?.error === 'string' ? { error: shape.error } : {}),
      ...base,
    };
  }
}

/**
 * A stackless stand-in for 4xx: a routine 401 or a validation 400 does not need
 * a stack in CloudWatch, only what it was and why.
 *
 * `pino-http` runs `stdSerializers.err` over this before the app's own
 * serializer sees it, and that is not a pass-through — it rewrites `type` on
 * anything with a string `message`. It preserves the original on `raw`, which
 * is what `logger.config.ts` reads back. Keep the two in step if either moves.
 */
function summarise(
  exception: unknown,
  status: number,
): { type: string; message: string | string[] } {
  if (!(exception instanceof HttpException)) {
    return { type: 'Error', message: `failed with status code ${status}` };
  }
  const payload = exception.getResponse();
  const message =
    typeof payload === 'string'
      ? payload
      : (readMessage((payload as { message?: unknown }).message) ??
        exception.message);
  return { type: exception.constructor.name, message };
}
