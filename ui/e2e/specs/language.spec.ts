import { expect, test } from '../support/test';

// A key with no translation renders as the key itself ("NAV.HOME"), which still
// satisfies a naive toBeVisible(). This is what that failure looks like in text.
const RAW_KEY_PATTERN = /[A-Z][A-Z_]*\.[A-Z_]+/;

/**
 * The header renders its language switch twice — once for the mobile layout, once
 * for the desktop one — and hides the inactive copy with CSS only. Both carry the
 * same aria-label, so every locator for it is narrowed to the visible instance;
 * otherwise Playwright's strict mode fails on two matches.
 */
test('switches between ua and en without leaking raw translation keys', async ({ page }) => {
  await page.goto('/');

  const nav = page.getByRole('navigation');
  await expect(page.getByRole('link', { name: 'Головна' })).toBeVisible();
  expect(await nav.innerText()).not.toMatch(RAW_KEY_PATTERN);

  await page
    .getByRole('button', { name: 'Змінити мову на англійську' })
    .filter({ visible: true })
    .click();

  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contacts' })).toBeVisible();
  expect(await nav.innerText()).not.toMatch(RAW_KEY_PATTERN);

  await page
    .getByRole('button', { name: 'Switch language to Ukrainian' })
    .filter({ visible: true })
    .click();

  await expect(page.getByRole('link', { name: 'Головна' })).toBeVisible();
});
