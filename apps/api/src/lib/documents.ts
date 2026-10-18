import type { Tx } from './prisma';

const PREFIXES = {
  sale: 'S',
  return: 'R',
  order: 'QB',
  purchaseOrder: 'PO',
} as const;

export type DocumentKind = keyof typeof PREFIXES;

/**
 * Allocates the next human-readable number for a document, e.g. `S-26-000124`.
 * The counter row is incremented inside the caller's transaction, so numbers
 * are gap-free for committed documents and never duplicated.
 */
export async function nextDocumentNumber(tx: Tx, kind: DocumentKind, at = new Date()) {
  const counter = await tx.counter.upsert({
    where: { key: kind },
    create: { key: kind, value: 1 },
    update: { value: { increment: 1 } },
  });
  const year = String(at.getFullYear()).slice(-2);
  return `${PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, '0')}`;
}
