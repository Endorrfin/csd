// 44 call sites read `err.error?.message` and two of them branch on
// `Array.isArray(err.error.message)`. These tests exist to make that break
// loudly if anyone reshapes the body.

import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AllExceptionsFilter,
  ErrorResponseBody,
} from './all-exceptions.filter';

interface FakeResponse {
  statusCode?: number;
  body?: ErrorResponseBody;
  headersSent: boolean;
  err?: unknown;
  status: jest.Mock;
  json: jest.Mock;
}

// `id: null` means "pino-http never ran". It must not be `undefined`: an
// explicit `undefined` argument activates the default parameter in JS, which
// made this helper silently keep handing back the id it was meant to omit.
function makeHost(
  res: FakeResponse,
  url = '/api/things/1?search=Ivan%20Petrenko',
  id: unknown = 'apigw-REQ-0001',
) {
  const req = { id, originalUrl: url };
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
}

function makeResponse(headersSent = false): FakeResponse {
  const res: Partial<FakeResponse> = { headersSent };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body: ErrorResponseBody) => {
    res.body = body;
    return res;
  });
  return res as FakeResponse;
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  describe('4xx — the shape Nest produced is preserved', () => {
    it('keeps statusCode, message and error of an HttpException', () => {
      const res = makeResponse();
      filter.catch(new NotFoundException('Form not found'), makeHost(res));

      expect(res.statusCode).toBe(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        message: 'Form not found',
        error: 'Not Found',
      });
    });

    it('keeps a ValidationPipe message ARRAY as an array', () => {
      const res = makeResponse();
      const messages = [
        'phone must be a valid phone number',
        'name is required',
      ];
      filter.catch(new BadRequestException(messages), makeHost(res));

      expect(Array.isArray(res.body?.message)).toBe(true);
      expect(res.body?.message).toEqual(messages);
    });

    it('handles an HttpException carrying a bare string payload', () => {
      const res = makeResponse();
      filter.catch(
        new HttpException('plain text', HttpStatus.CONFLICT),
        makeHost(res),
      );

      expect(res.statusCode).toBe(409);
      expect(res.body?.message).toBe('plain text');
    });

    it('adds requestId, timestamp and a query-free path', () => {
      const res = makeResponse();
      filter.catch(new ForbiddenException(), makeHost(res));

      expect(res.body?.requestId).toBe('apigw-REQ-0001');
      expect(res.body?.path).toBe('/api/things/1');
      expect(typeof res.body?.timestamp).toBe('string');
    });

    it('logs a 4xx without a stack', () => {
      const res = makeResponse();
      filter.catch(new ForbiddenException('nope'), makeHost(res));

      expect(res.err).toEqual({
        type: 'ForbiddenException',
        message: 'nope',
      });
    });
  });

  describe('5xx — the body is masked, the log keeps everything', () => {
    it('replaces the message of an InternalServerErrorException', () => {
      const res = makeResponse();
      const leaky = new InternalServerErrorException(
        'AWS_S3_PRIVATE_BUCKET is not configured',
      );
      filter.catch(leaky, makeHost(res));

      expect(res.statusCode).toBe(500);
      expect(res.body).toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        requestId: 'apigw-REQ-0001',
      });
      expect(JSON.stringify(res.body)).not.toContain('AWS_S3_PRIVATE_BUCKET');
      // …but the real exception still reaches the log.
      expect(res.err).toBe(leaky);
    });

    it('masks a non-HttpException and passes the original to the log', () => {
      const res = makeResponse();
      const boom = new Error('connect ECONNREFUSED 10.0.0.5:5432');
      filter.catch(boom, makeHost(res));

      expect(res.statusCode).toBe(500);
      expect(res.body?.message).toBe('Internal server error');
      expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
      expect(res.err).toBe(boom);
    });
  });

  describe('edge cases', () => {
    it('does not touch a response that is already streaming', () => {
      const res = makeResponse(true);
      filter.catch(new Error('late failure'), makeHost(res));

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      // The log still gets the error even though the body cannot change.
      expect(res.err).toBeInstanceOf(Error);
    });

    it('falls back to a generated requestId when pino-http did not set one', () => {
      const res = makeResponse();
      filter.catch(new NotFoundException(), makeHost(res, '/api/x', null));

      expect(res.body?.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('rethrows outside an HTTP context instead of swallowing', () => {
      const host = { getType: () => 'rpc' } as unknown as ArgumentsHost;
      expect(() => filter.catch(new Error('rpc'), host)).toThrow('rpc');
    });
  });
});
