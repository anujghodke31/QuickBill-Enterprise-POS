/**
 * Prints the image prompt for every catalogue product as JSON lines, marking the
 * ones that already have a photo. Used to drive image generation.
 *
 *   npm run ai:image-prompts -w @quickbill/api            # all products
 *   npm run ai:image-prompts -w @quickbill/api -- --missing
 */
import { CATALOG } from '../prisma/seed/catalog';
import {
  IMAGE_NEGATIVE_PROMPT,
  productImagePrompt,
  productImageUrl,
  productSlug,
} from '../prisma/seed/images';

const onlyMissing = process.argv.includes('--missing');

for (const [category, cat] of Object.entries(CATALOG)) {
  for (const item of cat.items) {
    const slug = productSlug(item);
    const hasImage = productImageUrl(slug) !== null;
    if (onlyMissing && hasImage) continue;
    console.log(
      JSON.stringify({
        slug,
        name: item.name,
        category,
        hasImage,
        prompt: productImagePrompt(item, cat.department),
        negativePrompt: IMAGE_NEGATIVE_PROMPT,
      }),
    );
  }
}
