// ui/e2e/support/test.ts
//
// Shared base test. Import `test` and `expect` from here, never from
// '@playwright/test' directly, so every spec gets the same network policy.
import { test as base, expect } from '@playwright/test';

/**
 * src/index.html pulls Leaflet and leaflet.markercluster from unpkg.com on every
 * page (they are CDN <script> tags, not npm dependencies — see ui/CLAUDE.md), and
 * the needs forms pull the Turnstile widget from Cloudflare. No test in this suite
 * needs either. Letting them through turns an unrelated CDN hiccup into a red
 * build, so they are cut off at the browser.
 *
 * This is browser-only by design: SSR never evaluates those <script> tags.
 *
 * ⚠ Consequence for the next person: a spec for `/activity-map` cannot use this
 * fixture — blocking unpkg leaves `globalThis.L` undefined and the map renders an
 * empty container. Import `test` from '@playwright/test' directly there, or make
 * the block list a fixture option.
 */
const BLOCKED_THIRD_PARTY = /(unpkg\.com|challenges\.cloudflare\.com)/;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(BLOCKED_THIRD_PARTY, (route) => route.abort());
    await use(page);
  },
});

export { expect };
