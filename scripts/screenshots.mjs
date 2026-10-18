// Captures the README screenshots from a running, seeded app.
// Usage: BASE=http://localhost:5173 node scripts/screenshots.mjs
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = 'docs/screenshots';
const PASSWORD = 'Demo@1234';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const shot = async (name, opts = {}) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log('saved', name);
};

async function signIn(email) {
  await context.clearCookies();
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

// Storefront
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await shot('shop-home');
await page.goto(`${BASE}/search?q=${encodeURIComponent('something for a headache')}`, {
  waitUntil: 'networkidle',
});
await shot('shop-search');
await page.goto(`${BASE}/p/britannia-100-whole-wheat-bread-450-g`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Frequently bought together' }).scrollIntoViewIfNeeded();
await page.mouse.wheel(0, -120);
await shot('shop-product');

// Sign-in
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await shot('login');

// Back office as a manager
await signIn('manager@quickbill.dev');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await shot('dashboard');
await page.goto(`${BASE}/admin/forecast`, { waitUntil: 'networkidle' });
await shot('forecast');

// A sale at the till as a cashier
await signIn('priya@quickbill.dev');
await page.goto(`${BASE}/admin/pos`, { waitUntil: 'networkidle' });
const search = page.getByLabel('Find a product');
for (const term of ['Amul Butter', 'Britannia 100%', 'Eggoz', 'Tata Tea Gold']) {
  await search.fill(term);
  await page.waitForTimeout(500);
  await page.locator('section[aria-label="Products"] li > button:not([disabled])').first().click();
}
await search.fill('');
await page.getByLabel('Customer mobile number').fill(process.env.CUSTOMER_PHONE ?? '');
await page.getByRole('button', { name: 'Find', exact: true }).click();
await page.waitForTimeout(500);
await page.getByRole('radio', { name: 'Cash' }).click();
await page.getByRole('button', { name: '₹500', exact: true }).click();
await shot('pos');
await page.getByRole('button', { name: /^Charge ₹/ }).click();
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(600);
await shot('pos-paid');

await browser.close();
