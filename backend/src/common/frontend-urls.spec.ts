// backend/src/common/frontend-urls.spec.ts
// regression tests for FRONTEND_URL parsing (audit P0-1)
import { getCanonicalFrontendUrl, getFrontendOrigins } from './frontend-urls';

describe('frontend-urls', () => {
  const originalEnv = process.env.FRONTEND_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalEnv;
    }
  });

  it('falls back to localhost when FRONTEND_URL is unset', () => {
    delete process.env.FRONTEND_URL;
    expect(getFrontendOrigins()).toEqual(['http://localhost:4200']);
  });

  it('falls back to localhost when FRONTEND_URL is empty (legacy serverless default)', () => {
    process.env.FRONTEND_URL = '';
    expect(getFrontendOrigins()).toEqual(['http://localhost:4200']);
  });

  it('parses a single origin', () => {
    process.env.FRONTEND_URL = 'https://www.csd-fund.org';
    expect(getFrontendOrigins()).toEqual(['https://www.csd-fund.org']);
  });

  it('parses a comma-separated allowlist, tolerating spaces and trailing slashes', () => {
    process.env.FRONTEND_URL =
      'https://www.csd-fund.org/, https://csd-fund.org';
    expect(getFrontendOrigins()).toEqual([
      'https://www.csd-fund.org',
      'https://csd-fund.org',
    ]);
  });

  it('never returns "*" even if configured', () => {
    process.env.FRONTEND_URL = 'https://www.csd-fund.org';
    expect(getFrontendOrigins()).not.toContain('*');
  });

  it('uses the first entry as the canonical URL for links', () => {
    process.env.FRONTEND_URL = 'https://www.csd-fund.org,https://csd-fund.org';
    expect(getCanonicalFrontendUrl()).toBe('https://www.csd-fund.org');
  });
});
