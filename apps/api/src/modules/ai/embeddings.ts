import path from 'node:path';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

// Sentence embeddings run locally (ONNX, CPU) so semantic search works without
// any API key and without sending catalog data to a third party.
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIMS = 384;

type Extractor = (
  texts: string[],
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;
let failed = false;

async function loadExtractor(): Promise<Extractor> {
  const transformers = await import('@huggingface/transformers');
  transformers.env.cacheDir = path.resolve(process.cwd(), '.cache/transformers');
  const extractor = await transformers.pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
  return extractor as unknown as Extractor;
}

export function embeddingsAvailable(): boolean {
  return env.EMBEDDINGS_ENABLED && !failed;
}

/** Embeds texts into unit-length vectors. Returns null when embeddings are unavailable. */
export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!embeddingsAvailable() || texts.length === 0) return null;
  try {
    extractorPromise ??= loadExtractor();
    const extractor = await extractorPromise;
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
  } catch (err) {
    failed = true;
    extractorPromise = null;
    logger.warn({ err }, 'Embedding model unavailable; falling back to keyword search');
    return null;
  }
}

/** pgvector literal, e.g. '[0.1,0.2,...]', to be cast with ::vector in SQL. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((x) => x.toFixed(6)).join(',')}]`;
}

interface EmbeddableProduct {
  name: string;
  brand: string | null;
  unit: string;
  tags: string[];
  description: string;
  category: { name: string; department: string };
}

export function productEmbeddingText(p: EmbeddableProduct): string {
  return [
    p.name,
    p.brand ? `Brand: ${p.brand}` : '',
    `Category: ${p.category.name}, ${p.category.department}`,
    p.tags.length ? `Good for: ${p.tags.join(', ')}` : '',
    p.description.slice(0, 400),
  ]
    .filter(Boolean)
    .join('. ');
}

/** (Re)computes embeddings for the given products, or for every product missing one. */
export async function embedProducts(productIds?: string[], batchSize = 32): Promise<number> {
  const products = await prisma.product.findMany({
    where: productIds ? { id: { in: productIds } } : { embeddedAt: null },
    include: { category: true },
  });
  let done = 0;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const vectors = await embed(batch.map(productEmbeddingText));
    if (!vectors) return done;
    await prisma.$transaction(
      batch.map((p, j) => {
        const literal = toVectorLiteral(vectors[j]!);
        return prisma.$executeRaw`
          UPDATE "Product" SET embedding = ${literal}::vector, "embeddedAt" = now()
          WHERE id = ${p.id}`;
      }),
    );
    done += batch.length;
  }
  return done;
}

/** Fire-and-forget re-embedding after a catalog edit. */
export function scheduleEmbedding(productIds: string[]): void {
  if (!embeddingsAvailable() || env.isTest) return;
  embedProducts(productIds).catch((err) => logger.warn({ err }, 'Background embedding failed'));
}
