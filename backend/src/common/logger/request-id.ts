// backend/src/common/logger/request-id.ts
// === ADDED: PR 1 / Step 17 — one correlation id per request. ===

import { randomUUID } from 'node:crypto';
import { getCurrentInvoke } from '@codegenie/serverless-express';

/** Cap on an id read out of the invocation event, in case it is malformed. */
const MAX_LENGTH = 128;

/**
 * The invocation event is external input and `getCurrentInvoke()` is declared
 * with `any` members, so every hop is checked rather than asserted.
 */
function readPath(source: unknown, path: readonly string[]): unknown {
  let current = source;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, MAX_LENGTH) : undefined;
}

/**
 * Resolution order, most useful first:
 *
 * 1. `event.requestContext.requestId` — API Gateway's own request id. It is
 *    what API Gateway returns in the `x-amzn-RequestId` response header and
 *    what its access logs key on, so a log line, an X-Ray trace and a future
 *    access log (PR 4) all join on a single field.
 * 2. `context.awsRequestId` — the Lambda invocation id, for an invocation that
 *    did not arrive through API Gateway.
 * 3. A fresh UUID — local `npm start` and e2e, where no invocation is in scope.
 *
 * An inbound `x-request-id` header is deliberately NOT honoured. Every public
 * endpoint on this API is anonymous, so a client-supplied id is unvalidated
 * input that would be stamped onto every log line of the request; a caller
 * could collide with, or poison, another request's correlation id.
 *
 * `getCurrentInvoke()` reads a module-level singleton that
 * `@codegenie/serverless-express` sets at the start of every invocation. That
 * is safe here because a Lambda container serves exactly one invocation at a
 * time — the value can never belong to a different in-flight request.
 */
export function resolveRequestId(): string {
  const invoke: unknown = getCurrentInvoke();
  return (
    readId(readPath(invoke, ['event', 'requestContext', 'requestId'])) ??
    readId(readPath(invoke, ['context', 'awsRequestId'])) ??
    randomUUID()
  );
}
