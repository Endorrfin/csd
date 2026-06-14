// Batch 1 — unit test for the shared security-headers (helmet) config
// Boots a throwaway Express app with only securityHeaders() so the assertions
// pin the EXACT header output of our config, independent of Nest/DB.
import express from 'express';
import request from 'supertest';
import { securityHeaders } from './security-headers';

describe('securityHeaders()', () => {
  const app = express();
  app.use(securityHeaders());
  app.get('/probe', (_req, res) => {
    res.json({ ok: true });
  });

  it('locks the CSP down for a JSON-only API', async () => {
    const res = await request(app).get('/probe');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
  });

  it('sets the core hardening headers and strips X-Powered-By', async () => {
    const res = await request(app).get('/probe');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends HSTS with the configured max-age and includeSubDomains, no preload', async () => {
    const res = await request(app).get('/probe');
    const hsts = res.headers['strict-transport-security'];
    expect(hsts).toContain('max-age=15552000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).not.toContain('preload');
  });
});
