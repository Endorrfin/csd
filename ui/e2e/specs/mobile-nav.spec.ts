import { expect, test } from '../support/test';

test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 logical size

/**
 * The mobile menu is never added to or removed from the DOM — the <nav> is always
 * there and slides in from off-screen via CSS. So toBeVisible() would pass even
 * while the menu is closed; toBeInViewport() is the assertion that actually
 * distinguishes the two states, and clicking a link inside it confirms it.
 */
test('mobile navigation opens and routes', async ({ page }) => {
  await page.goto('/');

  const nav = page.getByRole('navigation');
  await expect(nav).not.toBeInViewport();

  await page.getByRole('button', { name: 'Відкрити меню' }).click();
  await expect(nav).toBeInViewport();

  await nav.getByRole('link', { name: 'Контакти' }).click();
  await expect(page).toHaveURL(/\/contact$/);
});
