import { z } from 'zod';

// Tests get their environment from vitest.config.ts and must never pick up the
// developer's .env (which points at the dev database).
if (!process.env.VITEST) {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the real environment (CI, Docker, hosting platform).
  }
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_AUTH_TOKEN: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  /** An Anthropic-compatible gateway such as https://api.callmissed.com. The SDK reads it too. */
  ANTHROPIC_BASE_URL: z.string().optional(),
  EMBEDDINGS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  /** Claude features are on when any API credential is configured. */
  llmEnabled: Boolean(parsed.data.ANTHROPIC_API_KEY || parsed.data.ANTHROPIC_AUTH_TOKEN),
  allowedOrigins: parsed.data.APP_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
