import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production build: the API serves the built
 * web app on port 3000. Run `npm run build` and seed the database first, or
 * point E2E_BASE_URL at a running dev server.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -w @quickbill/api',
        url: 'http://localhost:3000/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: { NODE_ENV: 'production', PORT: '3000', APP_ORIGIN: 'http://localhost:3000' },
      },
});
