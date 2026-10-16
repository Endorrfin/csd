// === ADDED: spec 003 — e2e for the complaint and inquiry status audit ===
// Real app, real PostgreSQL 16. Unit tests with mocks cannot see SQL behaviour, so the
// properties that matter live here: the audit row commits (or rolls back) together with
// the change, concurrent edits produce a consistent chain, and public routes are untouched.

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

describe('Complaint + inquiry status audit (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let managerToken: string;
  let adminToken: string;
  let publicToken: string;
  let managerEmail: string;
  let adminEmail: string;

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

  async function newComplaint(
    description = 'Plain description',
  ): Promise<string> {
    const res = await http()
      .post('/api/complaints')
      .send({ category: 'other', description })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function newInquiry(): Promise<string> {
    const res = await http()
      .post('/api/inquiries')
      .send({
        reason: 'general',
        preferredLang: 'ua',
        message: 'Hello',
        // the DTO requires at least one contact channel
        email: 'visitor@example.com',
      })
      .expect(201);
    return (res.body as { id: string }).id;
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

  const complaintStatus = async (id: string): Promise<string | undefined> => {
    const rows = await dataSource.query<{ status: string }[]>(
      'SELECT status FROM complaints WHERE id = $1',
      [id],
    );
    return rows[0]?.status;
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await truncateAll(dataSource);
    const manager = await login(UserRole.MANAGER);
    const admin = await login(UserRole.ADMIN);
    const pub = await login(UserRole.PUBLIC);
    managerToken = manager.token;
    managerEmail = manager.email;
    adminToken = admin.token;
    adminEmail = admin.email;
    publicToken = pub.token;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM needs_form_audit_log');
    await dataSource.query('DELETE FROM complaints');
    await dataSource.query('DELETE FROM inquiries');
  });

  describe('public routes are untouched (D13)', () => {
    it('anonymous complaint and inquiry submits succeed and write no audit row', async () => {
      const c = await newComplaint();
      const i = await newInquiry();

      expect(await rowsFor(c)).toEqual([]);
      expect(await rowsFor(i)).toEqual([]);
      const total = await dataSource.query<{ n: string }[]>(
        'SELECT COUNT(*)::text AS n FROM needs_form_audit_log',
      );
      expect(total[0].n).toBe('0');
    });
  });

  describe('complaint', () => {
    it('PATCH :id/status records old, new, actor and a correlation id', async () => {
      const id = await newComplaint();

      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'in_review' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        formType: 'complaint',
        action: 'status_changed',
        fieldName: 'status',
        oldValue: 'new',
        newValue: 'in_review',
        changedByEmail: managerEmail,
      });
      expect(typeof rows[0].metadata?.requestId).toBe('string');
    });

    it('PATCH :id (generic update) records a status it carries', async () => {
      const id = await newComplaint();

      await http()
        .patch(`/api/complaints/${id}`)
        .set(bearer(managerToken))
        .send({ status: 'resolved' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'status_changed',
        oldValue: 'new',
        newValue: 'resolved',
      });
    });

    it('records nothing when the status is set to its current value', async () => {
      const id = await newComplaint();

      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'new' })
        .expect(200);

      expect(await rowsFor(id)).toEqual([]);
    });

    it('records ONE entry for status + notes, and never stores the note text', async () => {
      const id = await newComplaint('Description with PII-DESCRIPTION-MARKER');

      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'in_review', managerNotes: 'SECRET-NOTE-TEXT' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0].metadata).toMatchObject({ notesChanged: true });

      const everything = JSON.stringify(
        await dataSource.query('SELECT * FROM needs_form_audit_log'),
      );
      expect(everything).not.toContain('SECRET-NOTE-TEXT');
      expect(everything).not.toContain('PII-DESCRIPTION-MARKER');
    });

    it('records a notes-only change as an updated entry without the text', async () => {
      const id = await newComplaint();

      await http()
        .patch(`/api/complaints/${id}`)
        .set(bearer(managerToken))
        .send({ managerNotes: 'SECRET-NOTE-TEXT' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        action: 'updated',
        fieldName: 'managerNotes',
        oldValue: null,
        newValue: null,
      });
      expect(JSON.stringify(rows)).not.toContain('SECRET-NOTE-TEXT');
    });

    it('a role without access changes nothing and records nothing', async () => {
      const id = await newComplaint();

      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(publicToken))
        .send({ status: 'closed' })
        .expect(403);

      expect(await complaintStatus(id)).toBe('new');
      expect(await rowsFor(id)).toEqual([]);
    });

    it('an unknown id returns 404 and records nothing', async () => {
      const ghost = '11111111-1111-4111-8111-111111111111';

      await http()
        .patch(`/api/complaints/${ghost}/status`)
        .set(bearer(managerToken))
        .send({ status: 'closed' })
        .expect(404);

      expect(await rowsFor(ghost)).toEqual([]);
    });

    it('refuses to delete a non-closed complaint: record and history intact', async () => {
      const id = await newComplaint();

      await http()
        .delete(`/api/complaints/${id}`)
        .set(bearer(managerToken))
        .expect(400);

      expect(await complaintStatus(id)).toBe('new');
      expect(await rowsFor(id)).toEqual([]);
    });

    it('deletion is recorded and the history outlives the record', async () => {
      const id = await newComplaint();
      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'closed' })
        .expect(200);

      await http()
        .delete(`/api/complaints/${id}`)
        .set(bearer(managerToken))
        .expect(200);

      expect(await complaintStatus(id)).toBeUndefined();

      const history = await http()
        .get(`/api/audit-log/complaint/${id}`)
        .set(bearer(managerToken))
        .expect(200);
      const entries = history.body as {
        action: string;
        changedByEmail: string;
        details: { status?: string } | null;
      }[];
      expect(entries.map((e) => e.action)).toEqual([
        'deleted',
        'status_changed',
      ]);
      expect(entries[0]).toMatchObject({
        changedByEmail: managerEmail,
        details: { status: 'closed' },
      });
    });
  });

  describe('atomicity (D2)', () => {
    it('when the audit insert fails the status change is rolled back', async () => {
      const id = await newComplaint();
      // A real database-level failure, not a mock: every insert into the log is rejected.
      await dataSource.query(
        `ALTER TABLE needs_form_audit_log
           ADD CONSTRAINT zz_block_audit CHECK ("formId" IS NULL) NOT VALID`,
      );
      try {
        await http()
          .patch(`/api/complaints/${id}/status`)
          .set(bearer(managerToken))
          .send({ status: 'in_review' })
          .expect(500);

        expect(await complaintStatus(id)).toBe('new');
      } finally {
        await dataSource.query(
          'ALTER TABLE needs_form_audit_log DROP CONSTRAINT zz_block_audit',
        );
      }

      expect(await rowsFor(id)).toEqual([]);
    });

    it('a failed delete audit keeps the record', async () => {
      const id = await newComplaint();
      await http()
        .patch(`/api/complaints/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'closed' })
        .expect(200);
      await dataSource.query(
        `ALTER TABLE needs_form_audit_log
           ADD CONSTRAINT zz_block_audit CHECK ("formId" IS NULL) NOT VALID`,
      );
      try {
        await http()
          .delete(`/api/complaints/${id}`)
          .set(bearer(managerToken))
          .expect(500);

        expect(await complaintStatus(id)).toBe('closed');
      } finally {
        await dataSource.query(
          'ALTER TABLE needs_form_audit_log DROP CONSTRAINT zz_block_audit',
        );
      }
    });
  });

  describe('concurrency (D11)', () => {
    it('simultaneous changes produce a consistent old -> new chain', async () => {
      // Repeated, because a race is a probability, not a certainty.
      for (let round = 0; round < 8; round += 1) {
        const id = await newComplaint();

        await Promise.all([
          http()
            .patch(`/api/complaints/${id}/status`)
            .set(bearer(managerToken))
            .send({ status: 'in_review' }),
          http()
            .patch(`/api/complaints/${id}/status`)
            .set(bearer(managerToken))
            .send({ status: 'resolved' }),
        ]);

        const rows = await rowsFor(id);
        // Both changes really happened, one after the other.
        expect(rows).toHaveLength(2);
        expect(rows[0].oldValue).toBe('new');
        // The second entry replaced exactly what the first one wrote.
        expect(rows[1].oldValue).toBe(rows[0].newValue);
        expect(rows[0].newValue).not.toBe(rows[1].newValue);
        // And the stored status is the last entry's new value.
        expect(await complaintStatus(id)).toBe(rows[1].newValue);
      }
    });
  });

  describe('inquiry', () => {
    it('PATCH :id/status records the change with the admin as actor', async () => {
      const id = await newInquiry();

      await http()
        .patch(`/api/inquiries/${id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'read' })
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        formType: 'inquiry',
        action: 'status_changed',
        oldValue: 'new',
        newValue: 'read',
        changedByEmail: adminEmail,
      });
    });

    it('records nothing for a no-op and never stores note text', async () => {
      const id = await newInquiry();

      await http()
        .patch(`/api/inquiries/${id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'new' })
        .expect(200);
      expect(await rowsFor(id)).toEqual([]);

      await http()
        .patch(`/api/inquiries/${id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'new', managerNotes: 'SECRET-NOTE-TEXT' })
        .expect(200);
      const rows = await rowsFor(id);
      expect(rows).toHaveLength(1);
      expect(rows[0].action).toBe('updated');
      expect(JSON.stringify(rows)).not.toContain('SECRET-NOTE-TEXT');
    });

    it('manager is still refused on this route and nothing is recorded', async () => {
      const id = await newInquiry();

      await http()
        .patch(`/api/inquiries/${id}/status`)
        .set(bearer(managerToken))
        .send({ status: 'read' })
        .expect(403);

      expect(await rowsFor(id)).toEqual([]);
    });

    it('delete is allowed only when archived, and is recorded', async () => {
      const id = await newInquiry();
      await http()
        .delete(`/api/inquiries/${id}`)
        .set(bearer(adminToken))
        .expect(400);
      expect(await rowsFor(id)).toEqual([]);

      await http()
        .patch(`/api/inquiries/${id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'archived' })
        .expect(200);
      await http()
        .delete(`/api/inquiries/${id}`)
        .set(bearer(adminToken))
        .expect(200);

      const rows = await rowsFor(id);
      expect(rows.map((r) => r.action)).toEqual(['status_changed', 'deleted']);
      expect(rows[1].metadata).toMatchObject({ status: 'archived' });
    });

    it('when the audit insert fails the inquiry status is unchanged', async () => {
      const id = await newInquiry();
      await dataSource.query(
        `ALTER TABLE needs_form_audit_log
           ADD CONSTRAINT zz_block_audit CHECK ("formId" IS NULL) NOT VALID`,
      );
      try {
        await http()
          .patch(`/api/inquiries/${id}/status`)
          .set(bearer(adminToken))
          .send({ status: 'read' })
          .expect(500);

        const current = await dataSource.query<{ status: string }[]>(
          'SELECT status FROM inquiries WHERE id = $1',
          [id],
        );
        expect(current[0].status).toBe('new');
      } finally {
        await dataSource.query(
          'ALTER TABLE needs_form_audit_log DROP CONSTRAINT zz_block_audit',
        );
      }
    });
  });
});
