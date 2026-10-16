// === ADDED: spec 004 — public GET :id exposure and the guarded admin route ===
// Real app, real PostgreSQL 16.
//
// `leak` marks the assertions that describe the FIXED behaviour of the public routes
// (AC1–AC4). While the leak exists they fail, and `it.failing` turns that into a pass; the
// moment someone fixes the public route they go red, which forces PR C to flip them to `it`.

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, truncateAll } from './test-app.factory';
import { createUser } from './factories/user.factory';
import { UserRole } from '../src/modules/users/entities/user.entity';

const leak = it.failing;
const GHOST = '11111111-1111-4111-8111-111111111111';
const STAFF_NOTE = 'STAFF-ONLY-NOTE';

describe('Public GET :id exposure and the guarded admin route (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let managerToken: string;
  let publicToken: string;
  let donorToken: string;
  let managerEmail: string;

  let draftProcurement: string;
  let publishedProcurement: string;
  let draftVacancy: string;
  let publishedVacancy: string;
  let pendingTestimonial: string;
  let approvedTestimonial: string;

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

  const idOf = (res: request.Response) => (res.body as { id: string }).id;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    await truncateAll(dataSource);
    const manager = await login(UserRole.MANAGER);
    managerToken = manager.token;
    managerEmail = manager.email;
    publicToken = (await login(UserRole.PUBLIC)).token;
    donorToken = (await login(UserRole.DONOR)).token;

    const staff = (path: string, body: object) =>
      http().post(path).set(bearer(managerToken)).send(body).expect(201);
    const setStatus = (path: string, status: string, extra: object = {}) =>
      http()
        .patch(path)
        .set(bearer(managerToken))
        .send({ status, ...extra })
        .expect(200);

    draftProcurement = idOf(
      await staff('/api/procurement', {
        tenderTitleUa: 'Т',
        tenderTitleEn: 'Draft tender',
      }),
    );
    publishedProcurement = idOf(
      await staff('/api/procurement', {
        tenderTitleUa: 'Т',
        tenderTitleEn: 'Published tender',
      }),
    );
    await setStatus(
      `/api/procurement/${publishedProcurement}/status`,
      'published',
    );

    const vacancy = (title: string) => ({
      titleUa: 'П',
      titleEn: title,
      descriptionUa: 'О',
      descriptionEn: 'D',
      employmentType: 'full_time',
    });
    draftVacancy = idOf(await staff('/api/vacancies', vacancy('Draft role')));
    publishedVacancy = idOf(
      await staff('/api/vacancies', vacancy('Published role')),
    );
    await setStatus(`/api/vacancies/${publishedVacancy}/status`, 'published');

    const submit = async () =>
      idOf(
        await http()
          .post('/api/testimonials')
          .send({ authorName: 'Visitor', text: 'Thank you' })
          .expect(201),
      );
    pendingTestimonial = await submit();
    approvedTestimonial = await submit();
    await setStatus(
      `/api/testimonials/${approvedTestimonial}/status`,
      'approved',
      {
        managerNotes: STAFF_NOTE,
      },
    );
    await http()
      .patch(`/api/testimonials/${pendingTestimonial}`)
      .set(bearer(managerToken))
      .send({ managerNotes: STAFF_NOTE })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('guarded admin route GET /admin/:id (AC5, AC6)', () => {
    it.each([
      ['procurement', () => draftProcurement],
      ['vacancies', () => draftVacancy],
      ['testimonials', () => pendingTestimonial],
    ])('%s: staff can read a draft / pending record', async (module, id) => {
      const res = await http()
        .get(`/api/${module}/admin/${id()}`)
        .set(bearer(managerToken))
        .expect(200);

      expect((res.body as { id: string }).id).toBe(id());
    });

    it('returns the staff-only fields staff need to edit (testimonial notes)', async () => {
      const res = await http()
        .get(`/api/testimonials/admin/${pendingTestimonial}`)
        .set(bearer(managerToken))
        .expect(200);

      expect((res.body as { managerNotes: string }).managerNotes).toBe(
        STAFF_NOTE,
      );
    });

    it('never loads the creator: no createdBy object and no email anywhere', async () => {
      const res = await http()
        .get(`/api/procurement/admin/${draftProcurement}`)
        .set(bearer(managerToken))
        .expect(200);

      expect(res.body).not.toHaveProperty('createdBy');
      expect(JSON.stringify(res.body)).not.toContain(managerEmail);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|resetToken/);
    });

    it.each(['procurement', 'vacancies', 'testimonials'])(
      '%s: 401 without a token',
      async (module) => {
        await http().get(`/api/${module}/admin/${GHOST}`).expect(401);
      },
    );

    it.each([
      ['procurement', 'public'],
      ['vacancies', 'public'],
      ['testimonials', 'public'],
      ['procurement', 'donor'],
      ['vacancies', 'donor'],
      ['testimonials', 'donor'],
    ])('%s: 403 for role %s', async (module, role) => {
      const token = role === 'public' ? publicToken : donorToken;
      await http()
        .get(`/api/${module}/admin/${GHOST}`)
        .set(bearer(token))
        .expect(403);
    });

    it.each(['procurement', 'vacancies', 'testimonials'])(
      '%s: 404 for an unknown id and 400 for a non-UUID',
      async (module) => {
        await http()
          .get(`/api/${module}/admin/${GHOST}`)
          .set(bearer(managerToken))
          .expect(404);
        await http()
          .get(`/api/${module}/admin/not-a-uuid`)
          .set(bearer(managerToken))
          .expect(400);
      },
    );

    it('does not shadow the existing admin list routes', async () => {
      for (const module of ['procurement', 'vacancies', 'testimonials']) {
        await http()
          .get(`/api/${module}/admin/list`)
          .set(bearer(managerToken))
          .expect(200);
      }
    });
  });

  describe('public testimonial create cannot write staff-only fields (AC9)', () => {
    const count = async () => {
      const rows = await dataSource.query<{ n: string }[]>(
        'SELECT COUNT(*)::text AS n FROM testimonials',
      );
      return Number(rows[0].n);
    };

    it.each([
      ['managerNotes', { managerNotes: 'forged note' }],
      ['status', { status: 'approved' }],
    ])('rejects %s with 400 and stores nothing', async (_field, extra) => {
      const before = await count();

      await http()
        .post('/api/testimonials')
        .send({ authorName: 'Visitor', text: 'Hello', ...extra })
        .expect(400);

      expect(await count()).toBe(before);
    });

    it('still accepts a normal submission, including the publishedAt the form sends', async () => {
      const res = await http()
        .post('/api/testimonials')
        .send({
          authorName: 'Visitor',
          text: 'Hello',
          publishedAt: '2024-01-01',
        })
        .expect(201);

      const body = res.body as { status: string; publishedAt: string | null };
      expect(body.status).toBe('pending');
      expect(body.publishedAt).toBeNull();
    });
  });

  describe('public GET :id must show only what the public site shows (AC1–AC4)', () => {
    leak('AC1: a draft procurement is a 404', async () => {
      await http().get(`/api/procurement/${draftProcurement}`).expect(404);
    });

    leak('AC1: a draft vacancy is a 404', async () => {
      await http().get(`/api/vacancies/${draftVacancy}`).expect(404);
    });

    leak('AC2: a published procurement carries no creator data', async () => {
      const res = await http()
        .get(`/api/procurement/${publishedProcurement}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('createdBy');
      expect(res.body).not.toHaveProperty('createdById');
      expect(JSON.stringify(res.body)).not.toContain(managerEmail);
    });

    leak('AC2: a published vacancy carries no creator data', async () => {
      const res = await http()
        .get(`/api/vacancies/${publishedVacancy}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('createdById');
    });

    leak('AC3: a pending testimonial is a 404', async () => {
      await http().get(`/api/testimonials/${pendingTestimonial}`).expect(404);
    });

    leak('AC4: an approved testimonial carries no staff data', async () => {
      const res = await http()
        .get(`/api/testimonials/${approvedTestimonial}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('managerNotes');
      expect(res.body).not.toHaveProperty('createdById');
      expect(JSON.stringify(res.body)).not.toContain(STAFF_NOTE);
    });
  });
});
