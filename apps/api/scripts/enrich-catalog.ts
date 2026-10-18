/**
 * Catalog enrichment with the Claude Message Batches API (50% of standard cost).
 *
 * For each product, Claude writes the search phrases shoppers actually type
 * ("fever", "tiffin snack", "haldi") and a one-sentence description. Better
 * tags make the local embeddings, and therefore semantic search, much sharper.
 *
 *   npm run ai:enrich                     # every active product
 *   npm run ai:enrich -- --limit 20       # the first 20 products
 *   npm run ai:enrich -- --dry-run        # 5 products, print results, write nothing
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { embedProducts } from '../src/modules/ai/embeddings';

const POLL_MS = 30_000;

const Enrichment = z.object({
  tags: z.array(z.string().trim().min(2).max(40)).min(3).max(12),
  description: z.string().trim().min(10).max(300),
});
type Enrichment = z.infer<typeof Enrichment>;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    tags: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
  },
  required: ['tags', 'description'],
  additionalProperties: false,
} as const;

const SYSTEM = `You write catalog data for the online shop of an Indian neighbourhood grocery store in Pune.
For the product you are given, return JSON with:
- "tags": 6 to 10 short, lowercase search phrases a shopper might type to find this product. Include what it is, what it is used for, occasions or symptoms it suits, and common Hindi or Marathi names where natural (for example "haldi", "kanda", "dahi"). Do not repeat the brand name or the pack size.
- "description": one plain, factual sentence of at most 30 words describing the product for a shopper. No prices, no superlatives, and no medical claims beyond the product's ordinary use.`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function mergeTags(existing: string[], fresh: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...existing, ...fresh]) {
    const t = tag.trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.slice(0, 20);
}

function parseResult(message: Anthropic.Message): Enrichment | null {
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') return null;
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  try {
    const parsed = Enrichment.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function main() {
  if (!env.llmEnabled) {
    console.error(
      'No Claude API key is configured. Add ANTHROPIC_API_KEY to apps/api/.env, then run this again.',
    );
    process.exitCode = 1;
    return;
  }
  const dryRun = process.argv.includes('--dry-run');
  const limit = dryRun ? 5 : Number(arg('--limit') ?? 0) || undefined;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
    take: limit,
  });
  if (products.length === 0) {
    console.log('No products to enrich.');
    return;
  }

  const client = new Anthropic();
  const batch = await client.messages.batches.create({
    requests: products.map((p) => ({
      custom_id: p.id,
      params: {
        model: env.ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              name: p.name,
              brand: p.brand,
              unit: p.unit,
              category: p.category.name,
              department: p.category.department,
              currentTags: p.tags,
            }),
          },
        ],
      },
    })),
  });
  console.log(
    `Submitted batch ${batch.id} with ${products.length} products (${env.ANTHROPIC_MODEL}).`,
  );

  let status = batch;
  while (status.processing_status !== 'ended') {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    status = await client.messages.batches.retrieve(batch.id);
    const c = status.request_counts;
    console.log(
      `  ${status.processing_status}: ${c.succeeded} succeeded, ${c.errored} errored, ${c.processing} processing`,
    );
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const updates: { id: string; name: string; tags: string[]; description: string }[] = [];
  let failed = 0;
  for await (const result of await client.messages.batches.results(batch.id)) {
    const product = byId.get(result.custom_id);
    if (!product) continue;
    if (result.result.type !== 'succeeded') {
      failed++;
      console.warn(`  ${product.name}: ${result.result.type}`);
      continue;
    }
    const enrichment = parseResult(result.result.message);
    if (!enrichment) {
      failed++;
      console.warn(`  ${product.name}: response did not match the expected format`);
      continue;
    }
    updates.push({
      id: product.id,
      name: product.name,
      tags: mergeTags(product.tags, enrichment.tags),
      description: enrichment.description,
    });
  }

  if (dryRun) {
    for (const u of updates) {
      console.log(`\n${u.name}\n  tags: ${u.tags.join(', ')}\n  description: ${u.description}`);
    }
    console.log(`\nDry run: ${updates.length} results, ${failed} failed. Nothing was written.`);
    return;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.product.update({
        where: { id: u.id },
        data: { tags: u.tags, description: u.description },
      }),
    ),
  );
  console.log(`Updated ${updates.length} products (${failed} failed). Re-embedding…`);
  const embedded = await embedProducts(updates.map((u) => u.id));
  console.log(`Re-embedded ${embedded} products. Semantic search now uses the new tags.`);
}

main()
  .catch((err) => {
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
