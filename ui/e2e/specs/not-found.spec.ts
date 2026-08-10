import { expect, test } from '../support/test';

/**
 * Two failures in one: a white screen (SSR threw and returned nothing) and a soft
 * 404 (page renders but answers 200, which tells crawlers the URL is real).
 * NotFoundComponent sets the status through RESPONSE_INIT during SSR.
 */
test('unknown route renders the 404 page and answers with status 404', async ({ page }) => {
  const response = await page.goto('/no-such-page-e2e');

  expect(response?.status()).toBe(404);

  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
  await expect(page.getByText('Вибачте, але цієї сторінки не існує.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Назад на головну' })).toBeVisible();
});
