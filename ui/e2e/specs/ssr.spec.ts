import { expect, test } from '../support/test';

// Title of e2e/stub-api/fixtures/blog-featured.json. Kept as a literal on purpose:
// the assertion has to read as "this exact string must be in the server's HTML".
const FEATURED_TITLE_UA = 'E2E: головна новина фонду';

/**
 * Assert on the RAW HTTP response, never through page.goto(). By the time
 * Playwright hands back a DOM, Angular has hydrated and a purely client-rendered
 * page is indistinguishable from a server-rendered one.
 *
 * This is the same trap deploy.yml's smoke test used to fall into when it grepped
 * for a literal <app-root>: that tag is present in the CSR shell, so the check
 * passed precisely when SSR was broken.
 */
test('home page is served with server-rendered content, not a CSR shell', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);

  const html = await response.text();

  // 1. Angular's own marker that its engine rendered this response.
  expect(html).toContain('ng-server-context');

  // 2. The root element is not empty. An empty <app-root> is exactly what the
  //    engine emits when it deopts to CSR (bad X-Forwarded-* header, host
  //    validation failure — see src/server.ts).
  expect(html).not.toMatch(/<app-root[^>]*>\s*<\/app-root>/);

  // 3. Data the SSR process fetched itself is in the markup. This is the half a
  //    page.route() mock can never cover: the first paint happens in Node.
  expect(html).toContain(FEATURED_TITLE_UA);
});
