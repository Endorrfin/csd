// === ADDED: Jest setupFiles — runs in EVERY worker before AppModule loads ===
//
// Reads the PG connection info written by setup-pg.ts (globalSetup) and
// injects it into process.env, so ConfigService inside AppModule resolves
// the real container — without modifying app code for tests.

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PG_INFO_FILE } from './setup-pg';

interface PgInfo {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const raw = readFileSync(PG_INFO_FILE, 'utf8');
const info = JSON.parse(raw) as PgInfo;

process.env.DB_HOST = info.host;
process.env.DB_PORT = String(info.port);
process.env.DB_USERNAME = info.username;
process.env.DB_PASSWORD = info.password;
process.env.DB_NAME = info.database;

// CHANGED: generate a fresh JWT secret per test run instead of hardcoding one.
// Hardcoded values trip GitGuardian/secret scanners even when they're clearly
// throw-away. Random per-run also gives better test isolation — a token
// signed in one CI run can't be replayed in another.
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? randomBytes(32).toString('hex');

process.env.NODE_ENV = 'test';
