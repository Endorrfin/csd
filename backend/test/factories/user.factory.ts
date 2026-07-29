// === ADDED: User test factory ===
//
// Why a plain TS function and not @faker-js/factory-bot? CSD has ~15 entities
// with simple relations; factory-bot is overkill. Deterministic, explicit
// `overrides` make failures readable: `createUser({ role: ADMIN })` reads
// better in a test than `userFactory.build({ overrides: { ... } })`.
//
// Add sibling factories (blog.factory.ts, inquiry.factory.ts, …) following
// this shape as new modules get covered.

import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../src/modules/users/entities/user.entity';

let counter = 0;

export interface CreateUserOverrides {
  email?: string;
  password?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface CreatedUser {
  user: User;
  /** Plain-text password — needed by tests that hit POST /api/auth/login. */
  password: string;
}

export async function createUser(
  dataSource: DataSource,
  overrides: CreateUserOverrides = {},
): Promise<CreatedUser> {
  counter += 1;
  // CHANGED: random default instead of a hardcoded 'Test1234!'. Callers get the
  // plain-text value back in `CreatedUser.password`, so nothing needs to know it
  // up front — and no credential-shaped literal ends up in git. See the same
  // reasoning in test/setup-pg.ts and test/setup-env.ts.
  const password =
    overrides.password ?? `Aa1!${randomBytes(12).toString('hex')}`;
  const passwordHash = await bcrypt.hash(password, 4); // 4 rounds — fast for tests

  const repo = dataSource.getRepository(User);
  const user = await repo.save(
    repo.create({
      email: overrides.email ?? `user-${Date.now()}-${counter}@test.local`,
      passwordHash,
      role: overrides.role ?? UserRole.PUBLIC,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? `User${counter}`,
    }),
  );

  return { user, password };
}
