// === ADDED: spec 003 — server-side actor resolution for the status audit log ===
import { UnauthorizedException } from '@nestjs/common';
import type { AuditActor } from '../needs/audit-log.service';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

export type { AuditActor };

/**
 * The actor comes only from the verified JWT (`req.user`), never from the request body
 * (spec decision D9). Throws instead of returning nulls: a staff route that reaches this
 * without an authenticated user is a wiring mistake, and it must fail rather than write
 * an anonymous audit entry.
 */
export function requireActor(req: AuthenticatedRequest): AuditActor {
  const user = req.user;
  if (!user?.id || !user.email) {
    throw new UnauthorizedException();
  }
  return { userId: user.id, email: user.email };
}
