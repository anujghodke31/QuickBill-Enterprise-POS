import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import {
  GST_RATES,
  rupeesToPaise,
  type billScanConfirmSchema,
  type BillScanCandidate,
  type BillScanDTO,
  type BillScanLineDTO,
} from '@quickbill/shared';
import { conflict, notFound, unprocessable } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import { Prisma, prisma } from '../../../lib/prisma';
import { slugify } from '../../../lib/text';
import {
  createPurchaseOrderTx,
  receivePurchaseOrderTx,
} from '../../purchasing/purchase-orders.service';
import { describeClaudeError, fallbackParams, getClaude, MODEL } from '../claude';
import { embed, scheduleEmbedding, toVectorLiteral } from '../embeddings';
import { invalidateForecast } from '../forecast/forecast.service';

export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

/** What Claude extracts from the document. Amounts are rupees exactly as printed. */
const Extraction = z.object({
  is_invoice: z.boolean().describe('False if the document is not a supplier bill or invoice'),
  supplier_name: z.string().nullable(),
  supplier_gstin: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable().describe('ISO date YYYY-MM-DD'),
  prices_include_gst: z
    .boolean()
    .nullable()
    .describe('True if line prices already include GST, false if GST is added on top'),
  lines: z.array(
    z.object({
      description: z.string().describe('Item name as printed, including brand and pack size'),
      quantity: z.number(),
      unit: z.string().nullable().describe('e.g. pcs, kg, case'),
      unit_price: z.number().describe('Price per unit in rupees'),
      gst_rate: z.number().nullable().describe('GST percent for this line, if printed'),
      amount: z.number().describe('Line amount in rupees'),
    }),
  ),
  subtotal: z.number().nullable(),
  tax_total: z.number().nullable(),
  total: z.number().nullable(),
  warnings: z
    .array(z.string())
    .describe('Anything unreadable, ambiguous, or where the numbers do not add up'),
});
type Extraction = z.infer<typeof Extraction>;

const SYSTEM = `You read supplier bills (tax invoices) for an Indian grocery store and return their contents as structured data.
- Read every line item; do not skip, merge or summarise lines.
- Copy numbers exactly as printed, in rupees, without currency symbols or thousands separators.
- If a value is not printed or not legible, use null rather than guessing, and add a warning.
- If line totals do not add up to the printed total, add a warning describing the gap.
- If the document is not a bill or invoice, set is_invoice to false and return no lines.`;

const nearestSlab = (rate: number | null) =>
  rate === null
    ? null
    : GST_RATES.reduce(
        (best, slab) => (Math.abs(slab - rate) < Math.abs(best - rate) ? slab : best),
        0,
      );

async function extract(file: Buffer, mimeType: AcceptedType) {
  const data = file.toString('base64');
  const block: Anthropic.Beta.BetaContentBlockParam =
    mimeType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data } };

  const response = await getClaude().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...fallbackParams(),
    system: SYSTEM,
    output_config: { format: betaZodOutputFormat(Extraction), effort: 'medium' },
    messages: [
      { role: 'user', content: [block, { type: 'text', text: 'Extract this supplier bill.' }] },
    ],
  });
  if (response.stop_reason === 'refusal')
    throw unprocessable('The AI declined to read this document.');
  if (!response.parsed_output) throw unprocessable('Could not read a bill from this document.');
  return { extraction: response.parsed_output, usage: response.usage };
}

async function matchLine(
  description: string,
  vector: number[] | null,
): Promise<BillScanCandidate[]> {
  const scoreSql = vector
    ? Prisma.sql`0.55 * word_similarity(lower(${description}), lower(p.name || ' ' || coalesce(p.brand, '')))
                 + 0.45 * (1 - (p.embedding <=> ${toVectorLiteral(vector)}::vector))`
    : Prisma.sql`word_similarity(lower(${description}), lower(p.name || ' ' || coalesce(p.brand, '')))`;
  const rows = await prisma.$queryRaw<
    {
      productId: string;
      name: string;
      sku: string;
      costPrice: number;
      taxRate: number;
      score: number;
    }[]
  >`
    SELECT p.id AS "productId", p.name, p.sku, p."costPrice", p."taxRate",
           COALESCE(${scoreSql}, 0)::float8 AS score
    FROM "Product" p WHERE p."isActive"
    ORDER BY score DESC LIMIT 4`;
  return rows.map((r) => ({ ...r, score: Number(r.score.toFixed(3)) }));
}

async function matchSupplier(name: string | null, gstin: string | null) {
  if (gstin) {
    const byGstin = await prisma.supplier.findFirst({ where: { gstin: gstin.toUpperCase() } });
    if (byGstin) return byGstin.id;
  }
  if (!name) return null;
  const [row] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Supplier" WHERE similarity(lower(name), lower(${name})) > 0.35
    ORDER BY similarity(lower(name), lower(${name})) DESC LIMIT 1`;
  return row?.id ?? null;
}

/** Converts a printed line to a GST-inclusive unit cost in paise, as stored on purchase orders. */
function toUnitCost(line: Extraction['lines'][number], pricesIncludeGst: boolean | null) {
  const rate = nearestSlab(line.gst_rate) ?? 0;
  const unitPrice =
    line.quantity > 0 && line.unit_price === 0 ? line.amount / line.quantity : line.unit_price;
  const inclusive = pricesIncludeGst === false ? unitPrice * (1 + rate / 100) : unitPrice;
  return { unitCost: rupeesToPaise(inclusive), taxRate: rate };
}

type ScanResult = Omit<BillScanDTO, 'id' | 'status' | 'fileName' | 'purchaseOrderId' | 'createdAt'>;

export async function scanBill(
  file: { buffer: Buffer; mimetype: string; originalname: string },
  userId: string,
): Promise<BillScanDTO> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.mimetype)) {
    throw unprocessable('Upload a JPG, PNG, WebP or PDF file');
  }

  let extraction: Extraction;
  let usage: { input_tokens: number; output_tokens: number };
  try {
    ({ extraction, usage } = await extract(file.buffer, file.mimetype as AcceptedType));
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError ? describeClaudeError(err) : (err as Error).message;
    logger.warn({ err }, 'Bill scan failed');
    await prisma.billScan.create({
      data: {
        createdById: userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        status: 'FAILED',
        error: message,
        model: MODEL,
      },
    });
    throw err;
  }

  if (!extraction.is_invoice || extraction.lines.length === 0) {
    throw unprocessable(
      "This doesn't look like a supplier bill. Try a clearer photo of the invoice.",
    );
  }

  const vectors = await embed(extraction.lines.map((l) => l.description));
  const lines: BillScanLineDTO[] = await Promise.all(
    extraction.lines.map(async (line, i) => {
      const candidates = await matchLine(line.description, vectors?.[i] ?? null);
      const top = candidates[0];
      const { unitCost, taxRate } = toUnitCost(line, extraction.prices_include_gst);
      return {
        description: line.description,
        quantity: Math.max(1, Math.round(line.quantity)),
        unit: line.unit,
        unitCost,
        taxRate,
        amount: rupeesToPaise(line.amount),
        candidates,
        suggestedProductId: top && top.score >= 0.5 ? top.productId : null,
      };
    }),
  );

  const result: ScanResult = {
    supplier: {
      name: extraction.supplier_name,
      gstin: extraction.supplier_gstin,
      matchedSupplierId: await matchSupplier(extraction.supplier_name, extraction.supplier_gstin),
    },
    invoiceNumber: extraction.invoice_number,
    invoiceDate: extraction.invoice_date,
    lines,
    totals: {
      subtotal: extraction.subtotal === null ? null : rupeesToPaise(extraction.subtotal),
      tax: extraction.tax_total === null ? null : rupeesToPaise(extraction.tax_total),
      total: extraction.total === null ? null : rupeesToPaise(extraction.total),
    },
    warnings: extraction.warnings,
  };

  const scan = await prisma.billScan.create({
    data: {
      createdById: userId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      status: 'EXTRACTED',
      result: result as unknown as Prisma.InputJsonValue,
      model: MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    },
  });
  return toDTO(scan);
}

function toDTO(scan: {
  id: string;
  status: 'EXTRACTED' | 'CONFIRMED' | 'FAILED';
  fileName: string;
  result: Prisma.JsonValue;
  purchaseOrderId: string | null;
  createdAt: Date;
}): BillScanDTO {
  const result = (scan.result ?? {
    supplier: { name: null, gstin: null, matchedSupplierId: null },
    invoiceNumber: null,
    invoiceDate: null,
    lines: [],
    totals: { subtotal: null, tax: null, total: null },
    warnings: [],
  }) as unknown as ScanResult;
  return {
    ...result,
    id: scan.id,
    status: scan.status,
    fileName: scan.fileName,
    purchaseOrderId: scan.purchaseOrderId,
    createdAt: scan.createdAt.toISOString(),
  };
}

export async function listBillScans(userId?: string): Promise<BillScanDTO[]> {
  const scans = await prisma.billScan.findMany({
    where: { status: { not: 'FAILED' }, ...(userId ? { createdById: userId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return scans.map(toDTO);
}

export async function getBillScan(id: string): Promise<BillScanDTO> {
  const scan = await prisma.billScan.findUnique({ where: { id } });
  if (!scan) throw notFound('Bill scan');
  return toDTO(scan);
}

type ConfirmInput = z.output<typeof billScanConfirmSchema>;

/**
 * Applies a reviewed scan: creates any new products, records a received
 * purchase order (source BILL_SCAN) and adds the stock.
 */
export async function confirmBillScan(id: string, input: ConfirmInput, userId: string) {
  const scan = await prisma.billScan.findUnique({ where: { id } });
  if (!scan) throw notFound('Bill scan');
  if (scan.status !== 'EXTRACTED') throw conflict('This bill has already been processed');
  const items = input.lines.filter((l) => l.action !== 'skip');
  if (items.length === 0) throw unprocessable('Select at least one line to receive');

  const createdProductIds: string[] = [];
  const poId = await prisma.$transaction(async (tx) => {
    const poItems: { productId: string; quantity: number; unitCost: number; taxRate: number }[] =
      [];
    for (const line of items) {
      if (line.action === 'match') {
        poItems.push(line);
      } else if (line.action === 'create') {
        const base = slugify(line.name) || 'product';
        const product = await tx.product.create({
          data: {
            name: line.name,
            slug: `${base}-${id.slice(-6)}-${poItems.length}`,
            sku: `QB-${id.slice(-4).toUpperCase()}${poItems.length.toString().padStart(2, '0')}`,
            categoryId: line.categoryId,
            supplierId: input.supplierId,
            price: line.price,
            costPrice: line.unitCost,
            taxRate: line.taxRate,
            isPublished: false,
          },
        });
        createdProductIds.push(product.id);
        poItems.push({
          productId: product.id,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
        });
      }
    }

    const po = await createPurchaseOrderTx(
      tx,
      {
        supplierId: input.supplierId,
        items: poItems,
        supplierInvoiceNo: input.supplierInvoiceNo,
        invoiceDate: input.invoiceDate,
        notes: `Received from scanned bill ${scan.fileName}`,
      },
      userId,
      'BILL_SCAN',
    );
    await receivePurchaseOrderTx(tx, po.id, userId);
    await tx.billScan.update({
      where: { id },
      data: { status: 'CONFIRMED', purchaseOrderId: po.id },
    });
    return po.id;
  });

  if (createdProductIds.length) scheduleEmbedding(createdProductIds);
  invalidateForecast();
  return { purchaseOrderId: poId, createdProducts: createdProductIds.length };
}
