// Cloudflare Turnstile anti-spam guard (shared)
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/** Cloudflare siteverify response (fields we rely on). */
interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  challenge_ts?: string;
}

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_HEADER = 'x-turnstile-token';

/**
 * Verifies a Cloudflare Turnstile token on public POST endpoints.
 *
 * Token transport: the `x-turnstile-token` request header (NOT the body — the
 * global ValidationPipe runs `forbidNonWhitelisted`, so a body field would be
 * rejected unless added to every DTO).
 *
 * Fail-closed policy:
 *  - prod with a token that fails / a verification error → 403.
 *  - prod with TURNSTILE_SECRET_KEY unset → 403 (feature stays closed; we do
 *    NOT gate app boot on this, so the rest of the API keeps serving while the
 *    secret is being provisioned — see PR-2 notes).
 *  - non-prod with the secret unset → bypass with a warning, so local dev and
 *    e2e don't need Cloudflare credentials.
 *
 * Applied per-route via @UseGuards(TurnstileGuard). Reused by the recovery
 * submit + needs-upload endpoints now; WASH/complaint retrofit is a later PR.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = this.config.get<string>('TURNSTILE_SECRET_KEY');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (!secret) {
      if (isProd) {
        this.logger.error(
          'TURNSTILE_SECRET_KEY is not set in production — rejecting protected request (fail-closed).',
        );
        throw new ForbiddenException('Anti-spam verification unavailable');
      }
      this.logger.warn(
        'TURNSTILE_SECRET_KEY not set — bypassing Turnstile verification (non-production only).',
      );
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const token = req.header(TOKEN_HEADER);
    if (!token) {
      throw new ForbiddenException('Turnstile token missing');
    }

    const outcome = await this.verify(secret, token);
    if (!outcome.success) {
      this.logger.warn(
        `Turnstile verification failed: ${(outcome['error-codes'] ?? []).join(', ') || 'unknown'}`,
      );
      throw new ForbiddenException('Turnstile verification failed');
    }
    return true;
  }

  /** Calls Cloudflare siteverify. Any network/parse error fails closed. */
  private async verify(
    secret: string,
    token: string,
  ): Promise<TurnstileVerifyResponse> {
    try {
      const body = new URLSearchParams();
      body.set('secret', secret);
      body.set('response', token);

      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });

      const json: unknown = await res.json();
      return json as TurnstileVerifyResponse;
    } catch (err) {
      this.logger.error('Turnstile siteverify request failed', err as Error);
      // Fail closed on transport/parse errors.
      return { success: false, 'error-codes': ['internal-error'] };
    }
  }
}
