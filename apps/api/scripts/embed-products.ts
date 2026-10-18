/**
 * Computes semantic-search embeddings for products that do not have one yet.
 *
 *   npm run ai:embed            # only products missing an embedding
 *   npm run ai:embed -- --all   # recompute every product
 */
import { prisma } from '../src/lib/prisma';
import { embeddingsAvailable, embedProducts } from '../src/modules/ai/embeddings';

async function main() {
  if (!embeddingsAvailable()) {
    console.error('Embeddings are disabled. Set EMBEDDINGS_ENABLED=true in apps/api/.env.');
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--all')) {
    const { count } = await prisma.product.updateMany({ data: { embeddedAt: null } });
    console.log(`Re-embedding all ${count} products…`);
  }
  const started = Date.now();
  const done = await embedProducts();
  const missing = await prisma.product.count({ where: { embeddedAt: null } });
  console.log(
    `Embedded ${done} products in ${((Date.now() - started) / 1000).toFixed(1)}s.` +
      (missing ? ` ${missing} still have no embedding (the model may have failed to load).` : ''),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
