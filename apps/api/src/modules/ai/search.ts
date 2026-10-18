import { Prisma, prisma } from '../../lib/prisma';
import { embed, toVectorLiteral } from './embeddings';

export interface SearchFilters {
  category?: string;
  department?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface RankedId {
  id: string;
  score: number;
}

/** Reciprocal Rank Fusion constant; 60 is the value from the original RRF paper. */
const RRF_K = 60;
const CANDIDATES = 80;
/** Cosine similarity below which a semantic match is treated as noise. */
const MIN_SIMILARITY = 0.22;

function whereSql(f: SearchFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" AND p."isPublished"`];
  if (f.category) conditions.push(Prisma.sql`c.slug = ${f.category}`);
  if (f.department) conditions.push(Prisma.sql`c.department = ${f.department}`);
  if (f.minPrice !== undefined) conditions.push(Prisma.sql`p.price >= ${f.minPrice}`);
  if (f.maxPrice !== undefined) conditions.push(Prisma.sql`p.price <= ${f.maxPrice}`);
  return Prisma.join(conditions, ' AND ');
}

const documentSql = Prisma.sql`
  to_tsvector('english', p.name || ' ' || coalesce(p.brand, '') || ' ' || c.name || ' ' ||
    array_to_string(p.tags, ' ') || ' ' || p.description)`;

/**
 * Lexical retrieval: stemmed full-text search where any query term may match
 * (ranked by coverage), plus trigram similarity on the name for typos like "biscuts".
 */
export async function keywordCandidates(q: string, filters: SearchFilters): Promise<RankedId[]> {
  const rows = await prisma.$queryRaw<{ id: string; score: number }[]>`
    WITH query AS (
      SELECT regexp_replace(plainto_tsquery('english', ${q})::text, '&', '|', 'g') AS text
    ), scored AS (
      SELECT p.id,
        CASE WHEN (SELECT text FROM query) = '' THEN 0
             ELSE ts_rank_cd(${documentSql}, (SELECT text FROM query)::tsquery) END AS fts,
        word_similarity(${q}, p.name || ' ' || coalesce(p.brand, '')) AS trgm
      FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
      WHERE ${whereSql(filters)}
    )
    SELECT id, (fts * 4 + trgm)::float8 AS score FROM scored
    WHERE fts > 0 OR trgm > 0.4
    ORDER BY score DESC
    LIMIT ${CANDIDATES}`;
  return rows;
}

/** Dense retrieval: nearest products to the query embedding by cosine distance. */
export async function semanticCandidates(
  q: string,
  filters: SearchFilters,
): Promise<RankedId[] | null> {
  const vectors = await embed([q]);
  if (!vectors) return null;
  const literal = toVectorLiteral(vectors[0]!);
  const rows = await prisma.$queryRaw<{ id: string; score: number }[]>`
    SELECT p.id, (1 - (p.embedding <=> ${literal}::vector))::float8 AS score
    FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${whereSql(filters)} AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> ${literal}::vector
    LIMIT ${CANDIDATES}`;
  return rows.filter((r) => r.score >= MIN_SIMILARITY);
}

/**
 * Fuses ranked lists by Reciprocal Rank Fusion: each list contributes 1/(k + rank).
 * RRF needs no score normalisation, which suits mixing BM25-style and cosine scores.
 */
export function reciprocalRankFusion(lists: RankedId[][], k = RRF_K): RankedId[] {
  const fused = new Map<string, number>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      fused.set(item.id, (fused.get(item.id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...fused.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

export async function hybridSearch(q: string, filters: SearchFilters) {
  const [keyword, semantic] = await Promise.all([
    keywordCandidates(q, filters),
    semanticCandidates(q, filters),
  ]);
  if (!semantic) return { mode: 'keyword' as const, ranked: keyword };
  return { mode: 'hybrid' as const, ranked: reciprocalRankFusion([keyword, semantic]) };
}
