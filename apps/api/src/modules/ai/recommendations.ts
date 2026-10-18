import { prisma } from '../../lib/prisma';

interface CacheEntry<T> {
  value: T;
  expires: number;
}
const cache = new Map<string, CacheEntry<string[]>>();
const TTL_MS = 10 * 60 * 1000;

async function cached(key: string, compute: () => Promise<string[]>): Promise<string[]> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await compute();
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return value;
}

/**
 * "Frequently bought together" via market-basket analysis over in-store bills and
 * online orders. Candidates are ranked by lift — how much more often they appear
 * with this product than they do overall — so staples like milk do not dominate
 * every list. A minimum co-occurrence count filters out coincidences.
 */
export function frequentlyBoughtTogether(productId: string, limit = 4): Promise<string[]> {
  return cached(`fbt:${productId}:${limit}`, async () => {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      WITH baskets AS (
        SELECT "saleId" AS basket, "productId" FROM "SaleItem"
        UNION ALL
        SELECT "orderId", "productId" FROM "OrderItem"
      ),
      base AS (SELECT DISTINCT basket FROM baskets WHERE "productId" = ${productId}),
      total AS (SELECT COUNT(DISTINCT basket)::float8 AS n FROM baskets),
      pair AS (
        SELECT b."productId", COUNT(DISTINCT b.basket)::float8 AS together
        FROM baskets b JOIN base ON base.basket = b.basket
        WHERE b."productId" <> ${productId}
        GROUP BY 1 HAVING COUNT(DISTINCT b.basket) >= 3
      ),
      freq AS (SELECT "productId", COUNT(DISTINCT basket)::float8 AS cnt FROM baskets GROUP BY 1)
      SELECT pair."productId" AS id
      FROM pair
      JOIN freq USING ("productId")
      JOIN "Product" p ON p.id = pair."productId"
      CROSS JOIN total
      WHERE p."isActive" AND p."isPublished" AND p.stock > 0
      ORDER BY ((pair.together / (SELECT COUNT(*) FROM base)) / (freq.cnt / total.n))
               * ln(1 + pair.together) DESC
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  });
}

/** Nearest neighbours in embedding space: "you might also like". */
export function similarProducts(productId: string, limit = 8): Promise<string[]> {
  return cached(`sim:${productId}:${limit}`, async () => {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM "Product" p, (SELECT embedding FROM "Product" WHERE id = ${productId}) target
      WHERE p.id <> ${productId} AND p."isActive" AND p."isPublished"
        AND p.embedding IS NOT NULL AND target.embedding IS NOT NULL
      ORDER BY p.embedding <=> target.embedding
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  });
}

/**
 * Personal picks: the centroid of everything a shopper has bought, matched against
 * products they have not bought yet.
 */
export async function recommendedFor(userId: string, limit = 8): Promise<string[]> {
  const customer = await prisma.customer.findUnique({ where: { userId }, select: { id: true } });
  if (!customer) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH bought AS (
      SELECT si."productId" AS id FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
      WHERE s."customerId" = ${customer.id}
      UNION
      SELECT oi."productId" FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."customerId" = ${customer.id}
    ),
    taste AS (
      SELECT AVG(p.embedding) AS centroid FROM "Product" p
      WHERE p.id IN (SELECT id FROM bought) AND p.embedding IS NOT NULL
    )
    SELECT p.id FROM "Product" p, taste
    WHERE taste.centroid IS NOT NULL AND p.embedding IS NOT NULL
      AND p."isActive" AND p."isPublished" AND p.stock > 0
      AND p.id NOT IN (SELECT id FROM bought)
    ORDER BY p.embedding <=> taste.centroid
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}
