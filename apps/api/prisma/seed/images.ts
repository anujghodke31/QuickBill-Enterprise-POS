import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { slugify } from '../../src/lib/text';
import type { CatalogItem } from './catalog';

/** Product photos live in the web app's public folder and are served as /images/products/<slug>.webp. */
export const PRODUCT_IMAGE_DIR = fileURLToPath(
  new URL('../../../web/public/images/products/', import.meta.url),
);

export const productSlug = (item: Pick<CatalogItem, 'name' | 'unit'>) =>
  slugify(`${item.name} ${item.unit}`);

/** Public URL of a product's generated photo, or null when it has not been generated yet. */
export function productImageUrl(slug: string): string | null {
  return existsSync(`${PRODUCT_IMAGE_DIR}${slug}.webp`) ? `/images/products/${slug}.webp` : null;
}

/** Soft backdrop per department, echoing the storefront's packshot colours. */
const BACKDROPS: Record<string, string> = {
  Fresh: 'pale sage green',
  'Food & Groceries': 'warm light sand',
  'Snacks & Beverages': 'soft blush pink',
  'Health & Personal Care': 'pale aqua',
  'Home & Kitchen': 'soft lavender',
};

export const IMAGE_NEGATIVE_PROMPT =
  'text, letters, words, numbers, logos, brand names, trademarks, printed labels, watermark, hands, people, clutter, multiple backgrounds';

/**
 * Prompt for an unbranded studio product photo. Brand names are deliberately left
 * out so the model draws plain packaging instead of imitating real trademarks.
 */
export function productImagePrompt(item: CatalogItem, department: string): string {
  const backdrop = BACKDROPS[department] ?? 'light grey';
  return [
    `Studio product photograph of ${item.look}.`,
    `Centred square composition with generous space around the product, on a seamless ${backdrop} background with a soft natural shadow.`,
    'Bright, even lighting, crisp focus and realistic textures, in the style of a clean grocery e-commerce catalogue.',
    'All packaging is plain and unbranded: no logos, no brand names, no printed text or labels.',
  ].join(' ');
}
