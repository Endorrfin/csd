// backend/src/database/db-ssl.spec.ts
// The regression this guards is specific: production must never silently fall
// back to an unverified TLS connection. A missing or malformed bundle has to
// throw, because the failure mode it replaces (rejectUnauthorized: false) is
// invisible — everything keeps working, just without authentication.

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getDatabaseSslOptions } from './db-ssl';

const PEM = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBdummybase64content',
  '-----END CERTIFICATE-----',
  '',
].join('\n');

describe('getDatabaseSslOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DB_CA_BUNDLE;
    delete process.env.DB_CA_BUNDLE_PATH;
    delete process.env.LAMBDA_TASK_ROOT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('disables TLS outside production', () => {
    expect(getDatabaseSslOptions('development')).toBe(false);
    expect(getDatabaseSslOptions('test')).toBe(false);
    expect(getDatabaseSslOptions(undefined)).toBe(false);
  });

  it('does not read any bundle outside production', () => {
    process.env.DB_CA_BUNDLE_PATH = '/nonexistent/rds-ca.pem';

    expect(getDatabaseSslOptions('development')).toBe(false);
  });

  it('verifies the certificate in production from an inline bundle', () => {
    // Deliberately padded: a PEM pasted into a Lambda env var or a GitHub secret
    // routinely picks up surrounding whitespace. readCaBundle() trims it, and
    // Node's TLS parser is happy without a trailing newline.
    process.env.DB_CA_BUNDLE = `\n  ${PEM}  \n`;

    expect(getDatabaseSslOptions('production')).toEqual({
      rejectUnauthorized: true,
      ca: PEM.trim(),
    });
  });

  it('keeps the file bundle byte-for-byte (only the inline override is trimmed)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csd-ca-'));
    const path = join(dir, 'rds-ca.pem');
    writeFileSync(path, PEM, 'utf8');
    process.env.DB_CA_BUNDLE_PATH = path;

    expect(getDatabaseSslOptions('production')).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
  });

  it('reads the bundle from DB_CA_BUNDLE_PATH when no inline bundle is set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csd-ca-'));
    const path = join(dir, 'rds-ca.pem');
    writeFileSync(path, PEM, 'utf8');
    process.env.DB_CA_BUNDLE_PATH = path;

    expect(getDatabaseSslOptions('production')).toEqual({
      rejectUnauthorized: true,
      ca: PEM,
    });
  });

  it('throws in production when the bundle is missing', () => {
    process.env.DB_CA_BUNDLE_PATH = join(tmpdir(), 'csd-ca-does-not-exist.pem');

    expect(() => getDatabaseSslOptions('production')).toThrow(
      /Refusing to open an unverified TLS connection/,
    );
  });

  it('throws in production when the file is not a PEM certificate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csd-ca-'));
    const path = join(dir, 'not-a-cert.pem');
    writeFileSync(path, 'this is not a certificate', 'utf8');
    process.env.DB_CA_BUNDLE_PATH = path;

    expect(() => getDatabaseSslOptions('production')).toThrow(
      /contains no PEM certificate/,
    );
  });
});
