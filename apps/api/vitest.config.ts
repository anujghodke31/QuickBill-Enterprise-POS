import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://quickbill:quickbill@localhost:5432/quickbill_test';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-chars',
      JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-chars',
      EMBEDDINGS_ENABLED: 'false',
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_AUTH_TOKEN: '',
      LOG_LEVEL: 'silent',
    },
    globalSetup: ['./test/global-setup.ts'],
    // Integration tests share one database, so files run one at a time.
    fileParallelism: false,
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
