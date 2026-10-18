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
/**
 * Small sentence-embedding models give compressed similarity scores, so a fixed
 * cut-off cannot separate signal from noise. Semantic matches must also come within
 * this fraction of the best semantic match for the query.
 */
const RELATIVE_SIMILARITY = 0.85;
/** How much the semantic list counts in fusion when keyword search found matches too. */
const SEMANTIC_WEIGHT_WITH_KEYWORDS = 0.6;

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
  return relevantSemantic(rows);
}

/** Keeps semantic matches that clear both the absolute and the relative similarity bar. */
export function relevantSemantic(rows: RankedId[]): RankedId[] {
  const best = rows[0]?.score ?? 0;
  const floor = Math.max(MIN_SIMILARITY, best * RELATIVE_SIMILARITY);
  return rows.filter((r) => r.score >= floor);
}

/**
 * Fuses ranked lists by weighted Reciprocal Rank Fusion: each list contributes
 * weight / (k + rank). RRF needs no score normalisation, which suits mixing
 * full-text scores with cosine similarities.
 */
export function reciprocalRankFusion(
  lists: { items: RankedId[]; weight?: number }[],
  k = RRF_K,
): RankedId[] {
  const fused = new Map<string, number>();
  for (const { items, weight = 1 } of lists) {
    items.forEach((item, rank) => {
      fused.set(item.id, (fused.get(item.id) ?? 0) + weight / (k + rank + 1));
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
  // A query that names products is answered mostly by keywords; a query that only
  // describes a need ("something for a headache") falls through to meaning alone.
  const semanticWeight = keyword.length > 0 ? SEMANTIC_WEIGHT_WITH_KEYWORDS : 1;
  return {
    mode: 'hybrid' as const,
    ranked: reciprocalRankFusion([{ items: keyword }, { items: semantic, weight: semanticWeight }]),
  };
}
