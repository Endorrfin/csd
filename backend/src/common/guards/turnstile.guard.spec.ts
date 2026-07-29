// TurnstileGuard spec
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TurnstileGuard } from './turnstile.guard';

/** Build an ExecutionContext whose request exposes the given header value. */
const ctxWithToken = (token?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name.toLowerCase() === 'x-turnstile-token' ? token : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

const configWith = (
  values: Record<string, string | undefined>,
): ConfigService =>
  ({ get: (k: string) => values[k] }) as unknown as ConfigService;

describe('TurnstileGuard', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    // Silence expected warn/error output from the fail-closed paths.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bypasses verification when the secret is unset in non-production', async () => {
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: 'development' }),
    );
    await expect(guard.canActivate(ctxWithToken('tok'))).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed (403) when the secret is unset in production', async () => {
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: 'production' }),
    );
    await expect(guard.canActivate(ctxWithToken('tok'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when the token header is missing', async () => {
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: 'secret', NODE_ENV: 'production' }),
    );
    await expect(guard.canActivate(ctxWithToken(undefined))).rejects.toThrow(
      ForbiddenException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes when Cloudflare returns success:true', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: 'secret', NODE_ENV: 'production' }),
    );
    await expect(guard.canActivate(ctxWithToken('good-token'))).resolves.toBe(
      true,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('challenges.cloudflare.com');
    expect(init.method).toBe('POST');
  });

  it('rejects when Cloudflare returns success:false', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({ success: false, 'error-codes': ['invalid-input'] }),
    });
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: 'secret', NODE_ENV: 'production' }),
    );
    await expect(guard.canActivate(ctxWithToken('bad-token'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('fails closed when the siteverify request throws (Cloudflare unreachable)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const guard = new TurnstileGuard(
      configWith({ TURNSTILE_SECRET_KEY: 'secret', NODE_ENV: 'production' }),
    );
    await expect(guard.canActivate(ctxWithToken('tok'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
