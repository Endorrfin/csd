// === ADDED: spec 003 — unit tests for server-side actor resolution ===
import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { UserRole } from '../users/entities/user.entity';
import { requireActor } from './audit-actor';

function req(user: unknown): AuthenticatedRequest {
  return { user } as AuthenticatedRequest;
}

describe('requireActor', () => {
  it('builds the actor from the authenticated user only', () => {
    expect(
      requireActor(req({ id: 'u1', email: 'a@b.c', role: UserRole.MANAGER })),
    ).toEqual({ userId: 'u1', email: 'a@b.c' });
  });

  it('ignores anything a client put in the body', () => {
    const r = {
      user: { id: 'u1', email: 'a@b.c', role: UserRole.MANAGER },
      body: { changedByEmail: 'forged@evil.test', actor: { userId: 'x' } },
    } as unknown as AuthenticatedRequest;

    expect(requireActor(r)).toEqual({ userId: 'u1', email: 'a@b.c' });
  });

  it.each([[undefined], [null], [{}], [{ id: 'u1' }], [{ email: 'a@b.c' }]])(
    'throws instead of returning an anonymous actor (%j)',
    (user) => {
      expect(() => requireActor(req(user))).toThrow(UnauthorizedException);
    },
  );
});
