import { expect, test } from '../support/test';

/**
 * The inquiry form is the cheapest real submit path in the app: one step, no
 * Turnstile, no presigned upload. The needs forms (recovery, winterization) are
 * Turnstile-gated multi-step flows and belong to a later phase.
 *
 * Validity is enforced by disabling the submit button, so "empty form is blocked"
 * is asserted as toBeDisabled() — clicking would fail on an actionability timeout
 * and prove nothing about the app.
 */
test('inquiry form blocks an empty submit and accepts a filled one', async ({ page }) => {
  await page.goto('/contact');

  const submit = page.getByRole('button', { name: 'Надіслати' });
  await expect(submit).toBeDisabled();

  // Minimum valid combination: reason + message + at least one contact method
  // (atLeastOneContact is a cross-field validator on the form group).
  await page.getByLabel(/Тема звернення/).selectOption('general');
  await page.getByLabel(/Електронна пошта/).fill('e2e@example.com');
  await page.getByLabel(/Повідомлення/).fill('Playwright e2e smoke message.');

  await expect(submit).toBeEnabled();
  await submit.click();

  // POST /api/inquiries is answered by the stub; the component swaps the whole
  // form for this banner on any 2xx.
  await expect(page.getByText(/Дякуємо за ваше звернення/)).toBeVisible();
  await expect(submit).toBeHidden();
});
