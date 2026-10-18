import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { embeddingsAvailable, embedProducts } from './modules/ai/embeddings';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, llm: env.llmEnabled, embeddings: embeddingsAvailable() },
    `QuickBill API listening on http://localhost:${env.PORT}`,
  );
  // Backfill embeddings for any products that do not have one yet.
  if (embeddingsAvailable()) {
    embedProducts()
      .then((n) => n > 0 && logger.info({ count: n }, 'Embedded products'))
      .catch((err) => logger.warn({ err }, 'Embedding backfill failed'));
  }
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
