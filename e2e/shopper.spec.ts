import { expect, test } from '@playwright/test';

const addButtons = 'button[aria-label^="Add "][aria-label$=" to cart"]:not([disabled])';

test('search understands what a shopper needs, not just product names', async ({ page }) => {
  await page.goto(`/search?q=${encodeURIComponent('something for a headache')}`);
  await expect(page.getByText('Crocin Advance 500mg Tablets').first()).toBeVisible();
  await expect(page.getByText('Matched by meaning as well as keywords')).toBeVisible();
});

test('a guest adds products, checks out with cash on delivery and sees the order', async ({
  page,
}) => {
  await page.goto('/search?q=biscuits');
  await page.locator(addButtons).first().click();
  await page.goto('/search?q=tea');
  await page.locator(addButtons).first().click();

  await page.getByRole('link', { name: /^Cart, 2 items$/ }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to checkout' }).click();

  await page.getByLabel('Full name').fill('Test Shopper');
  await page.getByLabel('Email').fill('e2e.shopper@example.com');
  await page.getByLabel('Mobile number').fill('9123456780');
  await page.getByLabel('Flat, house or building').fill('Flat 12, Lotus Residency');
  await page.getByLabel('Street and area').fill('Baner Road');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('State').fill('Maharashtra');
  await page.getByLabel('PIN code').fill('411045');
  await page.getByText('Cash on delivery', { exact: true }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();

  await expect(page.getByText(/Your order is in/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Order QB-\d{2}-\d{6}$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Cart, 0 items$/ })).toBeVisible();
});
