// CHANGED: replaced boilerplate `Hello World!` test with a real e2e smoke test
// that exercises the whole pipeline — Testcontainers PG, migrations, AppModule,
// global /api prefix. If this passes, infra is wired correctly.

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './test-app.factory';

describe('App (e2e) — infrastructure smoke', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app.getHttpServer() as App)
      .get('/api/health')
      .expect(200);

    const body = res.body as { status: string; timestamp: string };
    expect(body).toMatchObject({ status: 'ok' });
    expect(typeof body.timestamp).toBe('string');
  });

  it('connects to the Testcontainers Postgres and has applied migrations', async () => {
    expect(dataSource.isInitialized).toBe(true);

    const rows = await dataSource.query<{ count: string }[]>(
      'SELECT COUNT(*)::text AS count FROM migrations',
    );
    // Migration count grows over time — assert "we ran at least one" instead
    // of a brittle exact number.
    expect(Number(rows[0].count)).toBeGreaterThan(0);
  });
});
