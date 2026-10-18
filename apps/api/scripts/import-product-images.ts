/**
 * Downloads generated product photos and stores them as optimised square WebP files
 * in apps/web/public/images/products, then points the matching products at them.
 *
 *   npx tsx scripts/import-product-images.ts <slug>=<url-or-path> [<slug>=<url-or-path> ...]
 */
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma';
import { PRODUCT_IMAGE_DIR } from '../prisma/seed/images';

const SIZE = 720;

async function load(source: string): Promise<Buffer> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${source}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(source);
}

async function main() {
  const pairs = process.argv.slice(2).map((arg) => {
    const at = arg.indexOf('=');
    if (at < 1) throw new Error(`Expected <slug>=<url-or-path>, got "${arg}"`);
    return { slug: arg.slice(0, at), source: arg.slice(at + 1) };
  });
  if (pairs.length === 0) {
    console.error('Usage: import-product-images <slug>=<url-or-path> ...');
    process.exitCode = 1;
    return;
  }

  await mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
  for (const { slug, source } of pairs) {
    const file = `${PRODUCT_IMAGE_DIR}${slug}.webp`;
    const info = await sharp(await load(source))
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80, effort: 5 })
      .toFile(file);
    const { count } = await prisma.product.updateMany({
      where: { slug },
      data: { imageUrl: `/images/products/${slug}.webp` },
    });
    console.log(
      `${slug}: ${Math.round(info.size / 1024)} KB${count ? '' : ' (no product with this slug yet)'}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
