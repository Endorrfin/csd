// the serializers are a security control, so they
// get tests. Two of these lock behaviour that was found the hard way:
//  - pino's own `err` serializer runs BEFORE ours and is not a pass-through;
//  - a TypeORM QueryFailedError carries the INSERT parameters, i.e. a
//    complainant's name and phone, and must never reach a log line.

import { Writable } from 'node:stream';
import pino from 'pino';
import pinoHttp from 'pino-http';
import type { Options } from 'pino-http';
import { loggerConfig } from './logger.config';

/**
 * Mirrors runtime wiring: `pino-http` mutates the options object in place
 * (installing `wrapErrorSerializer`), and only then is the app logger derived
 * from it. Testing the raw options would test something production never runs.
 */
function logLines(
  write: (logger: pino.Logger) => void,
): Record<string, unknown>[] {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  const [options] = loggerConfig.pinoHttp as [Options, unknown];
  pinoHttp(options, stream);
  write(pino(options, stream));
  return lines;
}

describe('loggerConfig serializers', () => {
  describe('err', () => {
    it('keeps type, message and stack of a real Error', () => {
      const [line] = logLines((l) =>
        l.error({ err: new TypeError('boom') }, 'x'),
      );
      expect(line.err).toMatchObject({ type: 'TypeError', message: 'boom' });
      expect(typeof (line.err as { stack?: unknown }).stack).toBe('string');
    });

    it('drops the TypeORM fields that carry submitted PII', () => {
      class QueryFailedError extends Error {
        query = 'INSERT INTO complaints(name, phone) VALUES ($1,$2)';
        parameters = ['Ivan Petrenko', '+380671234567'];
        driverError = {
          detail: 'Key (email)=(ivan@example.org) already exists.',
        };
        code = '23505';
        constructor() {
          super('duplicate key value violates unique constraint');
        }
      }
      const [line] = logLines((l) =>
        l.error({ err: new QueryFailedError() }, 'x'),
      );

      expect(line.err).toMatchObject({
        type: 'QueryFailedError',
        code: '23505',
      });
      const serialized = JSON.stringify(line);
      expect(serialized).not.toContain('Ivan Petrenko');
      expect(serialized).not.toContain('380671234567');
      expect(serialized).not.toContain('INSERT INTO');
      expect(serialized).not.toContain('ivan@example.org');
    });

    // The exception filter attaches this shape for a 4xx. pino's own serializer
    // treats any object with a string `message` as error-like and rewrites
    // `type` to "Object"; the real value survives on `raw`.
    it('recovers the exception type of a stackless 4xx summary', () => {
      const [line] = logLines((l) =>
        l.warn(
          { err: { type: 'UnauthorizedException', message: 'Unauthorized' } },
          'x',
        ),
      );
      expect(line.err).toEqual({
        type: 'UnauthorizedException',
        message: 'Unauthorized',
      });
    });

    it('keeps an array message from ValidationPipe intact', () => {
      const message = [
        'kind must be one of the following values',
        'name is required',
      ];
      const [line] = logLines((l) =>
        l.warn({ err: { type: 'BadRequestException', message } }, 'x'),
      );
      expect((line.err as { message: unknown }).message).toEqual(message);
    });
  });

  describe('req', () => {
    const request = {
      method: 'GET',
      originalUrl:
        '/api/complaints/admin/export?search=Ivan%20Petrenko&lang=ua',
      headers: {
        authorization: 'Bearer SECRET.JWT.VALUE',
        cookie: 'session=abc',
        'x-turnstile-token': 'turnstile-secret',
        'x-forwarded-for': '203.0.113.7',
        'user-agent': 'probe/1.0',
      },
      socket: { remoteAddress: '203.0.113.7', remotePort: 51515 },
    };

    it('logs the path and the query parameter NAMES, never their values', () => {
      const [line] = logLines((l) => l.info({ req: request }, 'x'));
      expect(line.req).toMatchObject({
        method: 'GET',
        path: '/api/complaints/admin/export',
        queryKeys: ['lang', 'search'],
      });
      expect(JSON.stringify(line)).not.toContain('Ivan');
    });

    it('allowlists headers — no credentials and no IP address', () => {
      const [line] = logLines((l) => l.info({ req: request }, 'x'));
      expect((line.req as { headers: unknown }).headers).toEqual({
        'user-agent': 'probe/1.0',
      });
      const serialized = JSON.stringify(line);
      for (const secret of [
        'SECRET.JWT.VALUE',
        'session=abc',
        'turnstile-secret',
        '203.0.113.7',
      ]) {
        expect(serialized).not.toContain(secret);
      }
    });
  });

  describe('redact', () => {
    it('censors credential-shaped keys anywhere in a logged object', () => {
      const [line] = logLines((l) =>
        l.info(
          { user: { email: 'a@b.c', password: 'hunter2', token: 'zzz' } },
          'x',
        ),
      );
      expect(line.user).toEqual({
        email: 'a@b.c',
        password: '[redacted]',
        token: '[redacted]',
      });
    });
  });
});
