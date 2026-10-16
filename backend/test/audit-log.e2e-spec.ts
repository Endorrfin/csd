// === ADDED: spec 003 — e2e for the status audit log read endpoint ===
// Runs the real app against the Testcontainers Postgres. The endpoint is read-only and
// security-sensitive, so this suite covers the role matrix, input validation, response
// shape, ordering, limits and the absence of any write route.

import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, truncateAll } from './test-app.factory';
import { createUser } from './factories/user.factory';
import { UserRole } from '../src/modules/users/entities/user.entity';

const ENTITY_ID = randomUUID();
const URL = (type: string, id: string = ENTITY_ID) =>
  `/api/audit-log/${type}/${id}`;

describe('GET /api/audit-log/:entityType/:entityId (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const tokens: Partial<Record<UserRole, string>> = {};

  const http = () => request(app.getHttpServer() as App);

  async function login(role: UserRole): Promise<string> {
    const { user, password } = await createUser(dataSource, { role });
    const res = await http()
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  }

  async function insertEntry(
    formType: string,
    formId: string,
    createdAt: string,
    overrides: { newValue?: string; metadata?: object } = {},
  ): Promise<void> {
    await dataSource.query(
      `INSERT INTO needs_form_audit_log
         (id, "formType", "formId", "changedById", "changedByEmail", action,
          "fieldName", "oldValue", "newValue", metadata, "createdAt")
       VALUES (uuid_generate_v4(), $1, $2, NULL, 'staff@test.local', 'status_changed',
          'status', 'new', $3, $4, $5)`,
      [
        formType,
        formId,
        overrides.newValue ?? 'closed',
        JSON.stringify(overrides.metadata ?? { requestId: 'internal-req-id' }),
        createdAt,
      ],
    );
  }

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await truncateAll(dataSource);
    for (const role of [
      UserRole.PUBLIC,
      UserRole.DONOR,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]) {
      tokens[role] = await login(role);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM needs_form_audit_log');
  });

  describe('authentication and roles', () => {
    it('401 without a token', async () => {
      await http().get(URL('complaint')).expect(401);
    });

    it('401 with a malformed token', async () => {
      await http()
        .get(URL('complaint'))
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it.each([[UserRole.PUBLIC], [UserRole.DONOR]])(
      '403 for role %s',
      async (role) => {
        await http()
          .get(URL('complaint'))
          .set('Authorization', `Bearer ${tokens[role]}`)
          .expect(403);
      },
    );

    it.each([[UserRole.MANAGER], [UserRole.ADMIN], [UserRole.SUPER_ADMIN]])(
      '200 for role %s',
      async (role) => {
        await http()
          .get(URL('complaint'))
          .set('Authorization', `Bearer ${tokens[role]}`)
          .expect(200);
      },
    );
  });

  describe('input validation', () => {
    const auth = () => ({
      Authorization: `Bearer ${tokens[UserRole.MANAGER]}`,
    });

    it.each([
      ['recovery'],
      ['winterization'],
      ['wash'],
      ['foo'],
      ['COMPLAINT'],
    ])('400 for entity type outside the whitelist: %s', async (type) => {
      await http().get(URL(type)).set(auth()).expect(400);
    });

    it('400 for a non-UUID entity id', async () => {
      await http().get(URL('complaint', 'not-a-uuid')).set(auth()).expect(400);
    });

    it.each([['0'], ['-1'], ['501'], ['abc']])(
      '400 for limit=%s',
      async (limit) => {
        await http()
          .get(`${URL('complaint')}?limit=${limit}`)
          .set(auth())
          .expect(400);
      },
    );

    it('400 for an unknown query parameter (forbidNonWhitelisted)', async () => {
      await http()
        .get(`${URL('complaint')}?formType=recovery`)
        .set(auth())
        .expect(400);
    });
  });

  describe('result', () => {
    const auth = () => ({
      Authorization: `Bearer ${tokens[UserRole.MANAGER]}`,
    });

    it('returns an empty list, not an error, for an id with no history', async () => {
      const res = await http().get(URL('vacancy')).set(auth()).expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns entries newest first, even when the record itself no longer exists', async () => {
      await insertEntry('complaint', ENTITY_ID, '2026-01-01T10:00:00Z', {
        newValue: 'in_review',
      });
      await insertEntry('complaint', ENTITY_ID, '2026-01-03T10:00:00Z', {
        newValue: 'closed',
      });
      await insertEntry('complaint', ENTITY_ID, '2026-01-02T10:00:00Z', {
        newValue: 'resolved',
      });

      const res = await http().get(URL('complaint')).set(auth()).expect(200);
      const body = res.body as { newValue: string }[];

      expect(body.map((e) => e.newValue)).toEqual([
        'closed',
        'resolved',
        'in_review',
      ]);
    });

    it('exposes only the documented fields', async () => {
      await insertEntry('complaint', ENTITY_ID, '2026-01-01T10:00:00Z', {
        metadata: { requestId: 'internal-req-id', notesChanged: true },
      });

      const res = await http().get(URL('complaint')).set(auth()).expect(200);
      const entry = (res.body as Record<string, unknown>[])[0];

      expect(Object.keys(entry).sort()).toEqual(
        [
          'action',
          'changedByEmail',
          'createdAt',
          'details',
          'id',
          'newValue',
          'oldValue',
        ].sort(),
      );
      expect(entry.details).toEqual({ notesChanged: true });
      expect(JSON.stringify(res.body)).not.toContain('internal-req-id');
      expect(JSON.stringify(res.body)).not.toContain('changedById');
    });

    it('does not mix entity types that share an id', async () => {
      await insertEntry('complaint', ENTITY_ID, '2026-01-01T10:00:00Z');
      await insertEntry('inquiry', ENTITY_ID, '2026-01-02T10:00:00Z');
      await insertEntry('recovery', ENTITY_ID, '2026-01-03T10:00:00Z');

      const res = await http().get(URL('complaint')).set(auth()).expect(200);
      expect(res.body as unknown[]).toHaveLength(1);
    });

    it('applies the default limit of 100 and honours an explicit limit', async () => {
      for (let i = 0; i < 105; i += 1) {
        await insertEntry(
          'complaint',
          ENTITY_ID,
          new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        );
      }

      const all = await http().get(URL('complaint')).set(auth()).expect(200);
      expect(all.body as unknown[]).toHaveLength(100);

      const some = await http()
        .get(`${URL('complaint')}?limit=3`)
        .set(auth())
        .expect(200);
      expect(some.body as unknown[]).toHaveLength(3);
    });
  });

  describe('append-only (no write routes)', () => {
    it.each([['post'], ['put'], ['patch'], ['delete']] as const)(
      '%s is not routable, even for a super_admin',
      async (method) => {
        await http()
          [method](URL('complaint'))
          .set('Authorization', `Bearer ${tokens[UserRole.SUPER_ADMIN]}`)
          .send({})
          .expect(404);
      },
    );

    it('has no collection-level write route either', async () => {
      await http()
        .post('/api/audit-log')
        .set('Authorization', `Bearer ${tokens[UserRole.SUPER_ADMIN]}`)
        .send({ formType: 'complaint' })
        .expect(404);
    });
  });
});
