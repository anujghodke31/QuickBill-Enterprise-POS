import { execSync } from 'node:child_process';
import pg from 'pg';

/** Creates the test database if needed and applies all migrations to it. */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://quickbill:quickbill@localhost:5432/quickbill_test';
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes('test')) {
    throw new Error(
      `Refusing to run tests against "${dbName}": the database name must contain "test".`,
    );
  }

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
