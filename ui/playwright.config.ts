// ui/playwright.config.ts
//
// Phase 1: browser tests against a locally built SSR app backed by a stub API.
// Fast, deterministic, no database. Phase 2 (docker compose with the real backend
// and Postgres) is a separate change.
import { defineConfig, devices } from '@playwright/test';

const isCi = !!process.env['CI'];

const APP_PORT = 4000; // src/server.ts default
const STUB_API_PORT = 3000; // environment.ts -> apiUrl
const BASE_URL = `http://localhost:${APP_PORT}`;

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: isCi,
  // One retry in CI only. A test that needs a second retry is broken, not flaky —
  // fix it or delete it the same day.
  retries: isCi ? 1 : 0,
  workers: isCi ? 1 : undefined,
  reporter: isCi
    ? [['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // chromium only. Firefox and WebKit triple the runtime and would each need their
  // own triage budget before they are worth adding.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      name: 'stub-api',
      command: 'node e2e/stub-api/server.mjs',
      port: STUB_API_PORT,
      // Never reuse. Port 3000 is also where `npm run start:dev` puts the REAL
      // backend, so reuse would silently run the whole suite against a developer's
      // local API and database. Failing with "port already used" is the safe
      // outcome: stop the backend, then run the tests.
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'ssr-app',
      // `--configuration development` on purpose. The default `ng build` is the
      // PRODUCTION configuration, whose fileReplacements swap in
      // environment.prod.ts — the tests would then render against the live API
      // Gateway and the real Turnstile site key. The development environment
      // points at http://localhost:3000, which is the stub above.
      command: 'npm run build:e2e && npm run serve:ssr:ui',
      url: BASE_URL,
      // Locally an already-running server on :4000 is reused, which skips the
      // rebuild — convenient while writing tests, but it means YOU are responsible
      // for restarting it after changing src/. CI always builds from scratch.
      reuseExistingServer: !isCi,
      // Covers `ng build` AND the SSR boot on a 2-core runner. This is the most
      // likely thing to time out in CI; raise it here rather than splitting the
      // build into its own step, which would duplicate the build locally.
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
