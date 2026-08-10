import { expect, test } from '../support/test';

// Titles and slugs from e2e/stub-api/fixtures/blog-list.json.
const FIRST_POST_TITLE_UA = 'E2E: перший пост';
const FIRST_POST_SLUG = 'e2e-post-1';
const SECOND_POST_TITLE_UA = 'E2E: другий пост';

/**
 * Guards the API contract between backend and ui: the shape the stub returns is
 * the shape BlogController actually returns ({ items, total, page, limit,
 * hasMore }). Rename a field on either side and this goes red.
 */
test('blog list renders the posts the API returned', async ({ page }) => {
  await page.goto('/blog');

  await expect(page.getByRole('heading', { level: 1, name: 'Новини' })).toBeVisible();

  await expect(page.getByRole('heading', { level: 2, name: FIRST_POST_TITLE_UA })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: SECOND_POST_TITLE_UA })).toBeVisible();

  // Each card's title is wrapped in the link to the post, so the link inherits the
  // heading text as its accessible name.
  await expect(page.getByRole('link', { name: FIRST_POST_TITLE_UA })).toHaveAttribute(
    'href',
    `/blog/${FIRST_POST_SLUG}`,
  );
});
