// === ADDED: spec 003 — e2e for the procurement, vacancy and testimonial status audit ===
// Real app, real PostgreSQL 16. Procurement is the risky one: its record is loaded together
// with `createdBy` (a nullable join) and PostgreSQL rejects FOR UPDATE across that join, which
// a mocked repository can never show. These tests exercise all 13 status-changing routes.

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, truncateAll } from './test-app.factory';
import { createUser } from './factories/user.factory';
import { UserRole } from '../src/modules/users/entities/user.entity';

interface AuditRow {
  formType: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedByEmail: string | null;
  metadata: Record<string, unknown> | null;
}

describe('Procurement / vacancy / testimonial status audit (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let managerToken: string;
  let managerEmail: string;
  let publicToken: string;

  const http = () => request(app.getHttpServer() as App);
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function login(role: UserRole) {
    const { user, password } = await createUser(dataSource, { role });
    const res = await http()
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(201);
    return {
      token: (res.body as { accessToken: string }).accessToken,
      email: user.email,
    };
  }

  const rowsFor = (id: string): Promise<AuditRow[]> =>
    dataSource.query<AuditRow[]>(
      `SELECT "formType", action, "fieldName", "oldValue", "newValue",
              "changedByEmail", metadata
         FROM needs_form_audit_log
        WHERE "formId" = $1
        ORDER BY "createdAt" ASC, id ASC`,
      [id],
    );

  const statusOf = async (
    table: string,
    id: string,
  ): Promise<string | undefined> => {
    const rows = await dataSource.query<{ status: string }[]>(
      `SELECT status FROM ${table} WHERE id = $1`,
      [id],
    );
    return rows[0]?.status;
  };

  const countOf = async (table: string): Promise<number> => {
    const rows = await dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*)::text AS n FROM ${table}`,
    );
    return Number(rows[0].n);
  };

  const blockAudit = () =>
    dataSource.query(
      `ALTER TABLE needs_form_audit_log
         ADD CONSTRAINT zz_block_audit CHECK ("formId" IS NULL) NOT VALID`,
    );
  const unblockAudit = () =>
    dataSource.query(
      'ALTER TABLE needs_form_audit_log DROP CONSTRAINT zz_block_audit',
    );

  async function newProcurement(status?: string): Promise<string> {
    const res = await http()
      .post('/api/procurement')
      .set(bearer(managerToken))
      .send({
        tenderTitleUa: 'Тендер',
        tenderTitleEn: 'Tender',
        ...(status ? { status } : {}),
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function newVacancy(status?: string): Promise<string> {
    const res = await http()
      .post('/api/vacancies')
      .set(bearer(managerToken))
      .send({
        titleUa: 'Посада',
        titleEn: 'Role',
        descriptionUa: 'Опис',
        descriptionEn: 'Description',
        employmentType: 'full_time',
        ...(status ? { status } : {}),
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  // Public, anonymous route: used to seed a testimonial exactly as a visitor would.
  async function newTestimonial(): Promise<string> {
    const res = await http()
      .post('/api/testimonials')
      .send({ authorName: 'Visitor', text: 'Thank you' })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await truncateAll(dataSource);
    const manager = await login(UserRole.MANAGER);
    const pub = await login(UserRole.PUBLIC);
    managerToken = manager.token;
    managerEmail = manager.email;
    publicToken = pub.token;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM needs_form_audit_log');
    await dataSource.query('DELETE FROM procurements');
    await dataSource.query('DELETE FROM vacancies');
    await dataSource.query('DELETE FROM testimonials');
  });

  describe('procurement (has the createdBy join)', () => {
    it('create by staff records `created` with the actor and the initial status', async () => {
      const id = await newProcurement();

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        formType: 'procurement',
        action: 'created',
        changedByEmail: managerEmail,
      });
      expect(rows[0].metadata).toMatchObject({ status: 'draft' });
    });

    it('PATCH :id/status works under the row lock despite the createdBy join', async () => {
      const id = await newProcurement();
      await dataSource.query('DELETE FROM needs_form_audit_log');

      const res = await http()
        .patch(`/api/procurement/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'published' })
        .expect(200);

      expect((res.body as { status: string }).status).toBe('published');
      // The response still carries the joined creator, as before the change.
      expect(res.body).toHaveProperty('createdBy');

      const rows = await rowsFor(id);
      // One entry for the status change; the publication date side effect is not logged.
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'status_changed',
        oldValue: 'draft',
        newValue: 'published',
        changedByEmail: managerEmail,
      });
    });

    it('PATCH :id (generic update) records a status it carries', async () => {
      const id = await newProcurement('published');
      await dataSource.query('DELETE FROM needs_form_audit_log');

      await http()
        .patch(`/api/procurement/${id}`)
        .set(bearer(managerToken))
        .send({ status: 'extended' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        oldValue: 'published',
        newValue: 'extended',
      });
    });

    it('legacy PATCH :id/publish is audited too', async () => {
      const id = await newProcurement();
      await dataSource.query('DELETE FROM needs_form_audit_log');

      await http()
        .patch(`/api/procurement/${id}/publish`)
        .set(bearer(managerToken))
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'status_changed',
        oldValue: 'draft',
        newValue: 'published',
      });
    });

    it('an edit that does not change the status records nothing', async () => {
      const id = await newProcurement();
      await dataSource.query('DELETE FROM needs_form_audit_log');

      await http()
        .patch(`/api/procurement/${id}`)
        .set(bearer(managerToken))
        .send({ tenderTitleEn: 'Renamed' })
        .expect(200);
      await http()
        .patch(`/api/procurement/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'draft' })
        .expect(200);

      expect(await rowsFor(id)).toEqual([]);
    });

    it('only a draft can be deleted; the deletion is recorded and outlives the record', async () => {
      const published = await newProcurement('published');
      await http()
        .delete(`/api/procurement/${published}`)
        .set(bearer(managerToken))
        .expect(400);
      expect(await statusOf('procurements', published)).toBe('published');

      const draft = await newProcurement();
      await http()
        .delete(`/api/procurement/${draft}`)
        .set(bearer(managerToken))
        .expect(200);
      expect(await statusOf('procurements', draft)).toBeUndefined();

      const history = await http()
        .get(`/api/audit-log/procurement/${draft}`)
        .set(bearer(managerToken))
        .expect(200);
      const entries = history.body as {
        action: string;
        details: { status?: string } | null;
      }[];
      expect(entries.map((e) => e.action)).toEqual(['deleted', 'created']);
      expect(entries[0].details).toEqual({ status: 'draft' });
    });

    it('a role without access changes nothing and records nothing', async () => {
      const id = await newProcurement();
      await dataSource.query('DELETE FROM needs_form_audit_log');

      await http()
        .patch(`/api/procurement/${id}/status`)
        .set(bearer(publicToken))
        .send({ status: 'published' })
        .expect(403);

      expect(await statusOf('procurements', id)).toBe('draft');
      expect(await rowsFor(id)).toEqual([]);
    });

    it('when the audit insert fails, the status change is rolled back', async () => {
      const id = await newProcurement();
      await dataSource.query('DELETE FROM needs_form_audit_log');
      await blockAudit();
      try {
        await http()
          .patch(`/api/procurement/${id}/status`)
          .set(bearer(managerToken))
          .send({ status: 'published' })
          .expect(500);
        expect(await statusOf('procurements', id)).toBe('draft');
      } finally {
        await unblockAudit();
      }
    });

    it('when the audit insert fails, a staff create inserts nothing', async () => {
      const before = await countOf('procurements');
      await blockAudit();
      try {
        await http()
          .post('/api/procurement')
          .set(bearer(managerToken))
          .send({ tenderTitleUa: 'Т', tenderTitleEn: 'T' })
          .expect(500);
        expect(await countOf('procurements')).toBe(before);
      } finally {
        await unblockAudit();
      }
    });

    it('simultaneous changes produce a consistent old -> new chain', async () => {
      for (let round = 0; round < 6; round += 1) {
        const id = await newProcurement();
        await dataSource.query(
          `DELETE FROM needs_form_audit_log WHERE "formId" = $1`,
          [id],
        );

        await Promise.all([
          http()
            .patch(`/api/procurement/${id}/status`)
            .set(bearer(managerToken))
            .send({ status: 'published' }),
          http()
            .patch(`/api/procurement/${id}/status`)
            .set(bearer(managerToken))
            .send({ status: 'cancelled' }),
        ]);

        const rows = await rowsFor(id);
        expect(rows).toHaveLength(2);
        expect(rows[0].oldValue).toBe('draft');
        expect(rows[1].oldValue).toBe(rows[0].newValue);
        expect(await statusOf('procurements', id)).toBe(rows[1].newValue);
      }
    });
  });

  describe('vacancy', () => {
    it('create by staff records `created` with the actor', async () => {
      const id = await newVacancy();

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        formType: 'vacancy',
        action: 'created',
        changedByEmail: managerEmail,
      });
      expect(rows[0].metadata).toMatchObject({ status: 'draft' });
    });

    it.each([
      ['PATCH :id/status', 'status', { status: 'on_hold' }],
      ['PATCH :id', 'update', { status: 'on_hold' }],
      ['legacy PATCH :id/publish', 'publish', {}],
    ])('%s is audited', async (_label, route, body) => {
      const id = await newVacancy();
      await dataSource.query('DELETE FROM needs_form_audit_log');
      const url =
        route === 'status'
          ? `/api/vacancies/${id}/status`
          : route === 'publish'
            ? `/api/vacancies/${id}/publish`
            : `/api/vacancies/${id}`;

      await http().patch(url).set(bearer(managerToken)).send(body).expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'status_changed',
        oldValue: 'draft',
      });
    });

    it('records nothing for a no-op and refuses to delete a non-draft', async () => {
      const id = await newVacancy('published');
      await dataSource.query('DELETE FROM needs_form_audit_log');

      await http()
        .patch(`/api/vacancies/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'published' })
        .expect(200);
      await http()
        .delete(`/api/vacancies/${id}`)
        .set(bearer(managerToken))
        .expect(400);

      expect(await rowsFor(id)).toEqual([]);
      expect(await statusOf('vacancies', id)).toBe('published');
    });

    it('deleting a draft is recorded', async () => {
      const id = await newVacancy();

      await http()
        .delete(`/api/vacancies/${id}`)
        .set(bearer(managerToken))
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows.map((r) => r.action)).toEqual(['created', 'deleted']);
    });

    it('when the audit insert fails, the status change is rolled back', async () => {
      const id = await newVacancy();
      await dataSource.query('DELETE FROM needs_form_audit_log');
      await blockAudit();
      try {
        await http()
          .patch(`/api/vacancies/${id}/status`)
          .set(bearer(managerToken))
          .send({ status: 'published' })
          .expect(500);
        expect(await statusOf('vacancies', id)).toBe('draft');
      } finally {
        await unblockAudit();
      }
    });
  });

  describe('testimonial', () => {
    it('the public submit is untouched: it succeeds and writes no audit row', async () => {
      const id = await newTestimonial();

      expect(await rowsFor(id)).toEqual([]);
      expect(await countOf('needs_form_audit_log')).toBe(0);
    });

    it.each([
      ['legacy /approve', 'approve', undefined, 'approved'],
      ['legacy /reject', 'reject', undefined, 'rejected'],
      ['PATCH :id', undefined, { status: 'approved' }, 'approved'],
      ['PATCH :id/status', 'status', { status: 'rejected' }, 'rejected'],
    ])('%s is audited', async (_label, route, body, expected) => {
      const id = await newTestimonial();
      const url = route
        ? `/api/testimonials/${id}/${route}`
        : `/api/testimonials/${id}`;

      await http()
        .patch(url)
        .set(bearer(managerToken))
        .send(body ?? {})
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        formType: 'testimonial',
        action: 'status_changed',
        oldValue: 'pending',
        newValue: expected,
        changedByEmail: managerEmail,
      });
    });

    it('records the notes flag but never the note text', async () => {
      const id = await newTestimonial();

      await http()
        .patch(`/api/testimonials/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'approved', managerNotes: 'SECRET-NOTE-TEXT' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0].metadata).toMatchObject({ notesChanged: true });
      const everything = JSON.stringify(
        await dataSource.query('SELECT * FROM needs_form_audit_log'),
      );
      expect(everything).not.toContain('SECRET-NOTE-TEXT');
    });

    it('the verify toggle is not a status and is not audited (decision D6)', async () => {
      const id = await newTestimonial();

      await http()
        .patch(`/api/testimonials/${id}/verify`)
        .set(bearer(managerToken))
        .send({ isVerified: true })
        .expect(200);

      expect(await rowsFor(id)).toEqual([]);
    });

    it('any testimonial can be deleted; the deletion is recorded with its status', async () => {
      const id = await newTestimonial();

      await http()
        .delete(`/api/testimonials/${id}`)
        .set(bearer(managerToken))
        .expect(200);

      const history = await http()
        .get(`/api/audit-log/testimonial/${id}`)
        .set(bearer(managerToken))
        .expect(200);
      const entries = history.body as {
        action: string;
        details: { status?: string } | null;
      }[];
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        action: 'deleted',
        details: { status: 'pending' },
      });
    });

    it('when the audit insert fails, the status change is rolled back', async () => {
      const id = await newTestimonial();
      await blockAudit();
      try {
        await http()
          .patch(`/api/testimonials/${id}/status`)
          .set(bearer(managerToken))
          .send({ status: 'approved' })
          .expect(500);
        expect(await statusOf('testimonials', id)).toBe('pending');
      } finally {
        await unblockAudit();
      }
    });
  });
});
