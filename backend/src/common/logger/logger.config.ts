// backend/src/common/logger/logger.config.ts
// === ADDED: PR 1 / Step 16 — the single structured-logging configuration. ===
//
// Three choices here are deliberate; "simplifying" any of them is a regression.
//
// 1. `sync: true` on the destination. Pino defaults to a SonicBoom with
//    `sync: false`, and pino's exit handler only rescues an orderly process
//    exit. On a timeout or OOM AWS kills the sandbox with no exit handlers:
//    measured 500 lines -> SIGKILL -> 1 survivor with `sync:false`, all 500
//    with `sync:true`. Those are exactly the lines logging exists for. This is
//    also why `lambda.ts` needs no flush of its own: a per-invocation flush
//    would have to be awaited every time and still would not cover a timeout.
//
// 2. Request bodies are never logged. pino-http does not log them either —
//    do not turn that on. This backend carries PSEA complaints, needs forms
//    and defect acts; such a body in CloudWatch is a leak, not diagnostics.
//
// 3. The serializers are allowlists, not a redact denylist. A denylist
//    silently passes through whatever nobody thought of.
//    - `req`: method and path WITHOUT the query string (the admin/export DTOs
//      of nine modules take `?search=`, a free-text box an operator types
//      names into), the query parameter NAMES (never values), and three
//      harmless headers. No IP at all: "IP + `POST /api/complaints`" is
//      de-anonymisation of the person who filed it, not diagnostics.
//    - `err`: type/message/stack/code only (plus one level of `cause`). The
//      default `stdSerializers.err` copies EVERY own property of the error,
//      and TypeORM's `QueryFailedError` carries `.query`, `.parameters` and
//      `.driverError.detail` — the INSERT parameters holding the complaint
//      text, the phone number and the email.
//
// The `redact` block below is a second line of defence against a future
// stray `logger.info({ user })`, not the primary control.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import pino from 'pino';
import { resolveRequestId } from './request-id';

/** The deploy smoke test hits this path five times in a row: noise, not signal. */
const HEALTH_PATH = '/api/health';

/** Echoed back so a caller can quote the id of a request that went wrong. */
const REQUEST_ID_HEADER = 'x-request-id';

const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;
type LogLevel = (typeof LOG_LEVELS)[number];
const DEFAULT_LOG_LEVEL: LogLevel = 'info';

/** Headers safe to log: no credentials, no IP addresses. */
const REQUEST_HEADER_ALLOWLIST = [
  'user-agent',
  'content-type',
  'content-length',
] as const;

/** Caps against log inflation driven by an attacker-controlled request. */
const MAX_HEADER_LENGTH = 256;
const MAX_QUERY_KEYS = 10;
const MAX_QUERY_KEY_LENGTH = 32;

type LoggedRequest = IncomingMessage & {
  id?: string | number;
  originalUrl?: string;
};

/**
 * An unknown level throws inside pino's constructor, so a typo in an
 * environment variable would take the Lambda down on cold start. Failing hard
 * is right for a missing CA bundle (`db-ssl.ts`), not for this — fall back to
 * `info` quietly instead.
 */
function resolveLevel(raw: string | undefined): LogLevel {
  const value = raw?.trim().toLowerCase() ?? '';
  return (LOG_LEVELS as readonly string[]).includes(value)
    ? (value as LogLevel)
    : DEFAULT_LOG_LEVEL;
}

function splitUrl(url: string | undefined): {
  path: string;
  queryKeys?: string[];
} {
  const raw = url ?? '';
  const separator = raw.indexOf('?');
  if (separator === -1) return { path: raw };

  const keys = [
    ...new Set(new URLSearchParams(raw.slice(separator + 1)).keys()),
  ]
    .sort()
    .slice(0, MAX_QUERY_KEYS)
    .map((key) => key.slice(0, MAX_QUERY_KEY_LENGTH));

  return {
    path: raw.slice(0, separator),
    queryKeys: keys.length > 0 ? keys : undefined,
  };
}

function pickHeaders(
  headers: IncomingMessage['headers'],
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const name of REQUEST_HEADER_ALLOWLIST) {
    const value = headers[name];
    if (typeof value === 'string')
      picked[name] = value.slice(0, MAX_HEADER_LENGTH);
  }
  return picked;
}

function isHealthProbe(req: LoggedRequest): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  return splitUrl(req.originalUrl ?? req.url).path === HEALTH_PATH;
}

function serializeRequest(req: LoggedRequest): Record<string, unknown> {
  // Express rewrites req.url under mounted middleware; originalUrl survives.
  const { path, queryKeys } = splitUrl(req.originalUrl ?? req.url);
  return {
    method: req.method,
    path,
    ...(queryKeys ? { queryKeys } : {}),
    headers: pickHeaders(req.headers),
  };
}

function serializeResponse(res: ServerResponse): Record<string, unknown> {
  return { statusCode: res.statusCode };
}

const ERROR_FIELDS = ['type', 'message', 'stack', 'code'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fromError(error: Error, depth: number): Record<string, unknown> {
  const safe: Record<string, unknown> = {
    type: error.constructor?.name ?? 'Error',
    message: error.message,
    stack: error.stack,
  };

  const { code } = error as { code?: unknown };
  if (typeof code === 'string' || typeof code === 'number') safe.code = code;

  // One level of `cause`: the wrapper chain is useful, deeper recursion is not.
  if (depth === 0 && error.cause !== undefined) {
    safe.cause = serializeError(error.cause, depth + 1);
  }

  return safe;
}

function fromSerialized(
  value: Record<string, unknown>,
  depth: number,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const field of ERROR_FIELDS) {
    const field_value = value[field];
    if (field_value === undefined) continue;
    // pino stamps `stack: ''` on anything it decides is error-like; an empty
    // stack is twelve bytes of nothing on every 4xx.
    if (field === 'stack' && field_value === '') continue;
    safe[field] = field_value;
  }
  if (depth === 0 && value.cause !== undefined) {
    safe.cause = serializeError(value.cause, depth + 1);
  }
  return safe;
}

/**
 * Accepts a raw `Error`, an already-serialized error object, and the plain
 * `{ type, message }` summary the exception filter attaches for a 4xx.
 *
 * pino-http wraps any custom error serializer in
 * `stdSerializers.wrapErrorSerializer`, so on the HTTP path this receives the
 * output of `stdSerializers.err(err)`, not the value that was logged. That
 * wrapper is NOT a pass-through for non-Errors: `isErrorLike()` accepts any
 * object with a string `message`, and for those it rewrites `type` to the
 * constructor name of the plain object — literally `"Object"` — and appends an
 * empty `stack` (`pino-std-serializers/lib/err.js`). It does keep the value it
 * was handed on `raw`, so `raw` is the honest source whenever it is present.
 *
 * Every path funnels into the same allowlist, which is why TypeORM's `.query`,
 * `.parameters` and `.driverError` reach the log through none of them.
 */
function serializeError(value: unknown, depth = 0): Record<string, unknown> {
  if (value instanceof Error) return fromError(value, depth);
  if (isRecord(value)) {
    if (value.raw instanceof Error) return fromError(value.raw, depth);
    return fromSerialized(isRecord(value.raw) ? value.raw : value, depth);
  }
  return { message: String(value) };
}

export const loggerConfig: Params = {
  pinoHttp: [
    {
      level: resolveLevel(process.env.LOG_LEVEL),
      // In a Lambda, pid and hostname describe the container that CloudWatch
      // already names with its own log stream. Drop the constant from every
      // line.
      base: null,
      // "level":"warn" instead of "level":40 — Logs Insights queries and metric
      // filters then read without a lookup table.
      formatters: {
        level: (label) => ({ level: label }),
      },
      serializers: {
        req: serializeRequest,
        res: serializeResponse,
        err: serializeError,
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-turnstile-token"]',
          'password',
          'token',
          'secret',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.resetToken',
          '*.secret',
          '*.authorization',
        ],
        censor: '[redacted]',
      },
      // `quietReqLogger` is what puts the correlation id on EVERY line of a
      // request instead of only the completion line. With it, pino-http builds
      // `req.log` as `logger.child({ requestId })` — and nestjs-pino stores
      // exactly that logger in its AsyncLocalStorage, so an injected
      // `PinoLogger` and any `new Logger()` call site inherit the id with no
      // plumbing. The completion line still gets the full `req` object on top.
      quietReqLogger: true,
      customAttributeKeys: { reqId: 'requestId' },
      genReqId: (req, res) => {
        const id = resolveRequestId();
        // pino-http runs this before the route handler, so the headers are
        // never sent yet; the guard is here only so a future middleware
        // ordering change degrades into a missing header, not a crash.
        if (!res.headersSent) res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      autoLogging: { ignore: isHealthProbe },
      // pino-http's default message is `!req.readableAborted &&
      // res.writableEnded ? 'request completed' : 'request aborted'`. Under
      // `@codegenie/serverless-express` `res.writableEnded` stays false, so in
      // Lambda EVERY successful request would be labelled "request aborted". A
      // client abort is not observable behind API Gateway anyway (the gateway
      // buffers the whole request), which leaves readableAborted as the only
      // honest signal here.
      customSuccessMessage: (req) =>
        (req as { readableAborted?: boolean }).readableAborted === true
          ? 'request aborted'
          : 'request completed',
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    },
    pino.destination({ dest: 1, sync: true }),
  ],
};

// Step 19 (ExceptionFilter) must attach the real error to `res.err`, otherwise
// pino-http synthesises its own `new Error('failed with status code 500')` for
// every 5xx, carrying pino-http's own stack — bytes without information. It
// should also put `requestId` in the error response body: the browser cannot
// read the `x-request-id` header cross-origin unless the CORS config starts
// exposing it, and the API is served from a different origin than the site.
