import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('a cashier rings up a cash sale and gets change back', async ({ page }) => {
  await signIn(page, 'priya@quickbill.dev');
  await expect(page).toHaveURL(/\/admin\/pos$/);

  const tiles = page.locator('section[aria-label="Products"] li > button:not([disabled])');
  await tiles.nth(0).click();
  await tiles.nth(1).click();
  await tiles.nth(1).click();
  const bill = page.getByRole('list', { name: 'Items on the bill' });
  await expect(bill.getByRole('listitem')).toHaveCount(2);

  await page.getByRole('radio', { name: 'Cash' }).click();
  await page.getByLabel('Cash received in rupees').fill('5000');
  await page.getByRole('button', { name: /^Charge ₹/ }).click();

  const receipt = page.getByRole('dialog');
  await expect(receipt).toContainText('Paid');
  await expect(receipt).toContainText(/Bill S-\d{2}-\d{6}, Cash/);
  await expect(receipt).toContainText('Give back');
  await receipt.getByRole('button', { name: 'Start next bill' }).click();
  await expect(page.getByText('Scan or tap a product to start a bill.')).toBeVisible();
});

test('cashiers are kept to selling, managers see the dashboard', async ({ page }) => {
  await signIn(page, 'priya@quickbill.dev');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/pos$/);
  const nav = page.getByRole('navigation', { name: 'Back office' });
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Reorder forecast' })).toHaveCount(0);

  await page.context().clearCookies();
  await signIn(page, 'manager@quickbill.dev');
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: /^Good (morning|afternoon|evening), Vikram$/ }),
  ).toBeVisible();
  await expect(page.getByText('Sales today')).toBeVisible();
});

test('shoppers cannot open the back office', async ({ page }) => {
  await signIn(page, 'shopper@quickbill.dev');
  await page.goto('/admin/products');
  await expect(page).toHaveURL(/\/$/);
});

test('the reorder forecast lists products at risk', async ({ page }) => {
  await signIn(page, 'manager@quickbill.dev');
  await page.goto('/admin/forecast');
  await expect(page.getByRole('heading', { name: 'Reorder forecast' })).toBeVisible();
  await expect(page.getByText('Critical').first()).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
