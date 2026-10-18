/**
 * Generates a realistic supplier tax invoice PDF for demoing the bill scanner.
 * Printed names deliberately differ from the catalog ("MAGGI 2-MIN MASALA
 * NOODLES 70G" vs "Maggi 2-Minute Masala Noodles"), and one item is not in the
 * catalog at all, so the matching step has real work to do.
 *
 *   npx tsx scripts/make-sample-bill.ts   (from apps/api)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

interface Line {
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  /** Rate per unit before GST, in rupees. */
  rate: number;
  gst: number;
}

const LINES: Line[] = [
  {
    description: 'MAGGI 2-MIN MASALA NOODLES 70G',
    hsn: '19023010',
    qty: 48,
    unit: 'PCS',
    rate: 12.14,
    gst: 5,
  },
  {
    description: 'PARLE G GLUCOSE BISCUIT 250 GM',
    hsn: '19053100',
    qty: 60,
    unit: 'PCS',
    rate: 20.24,
    gst: 5,
  },
  {
    description: 'LAYS CLASSIC SALTED CHIPS 52G',
    hsn: '20052000',
    qty: 40,
    unit: 'PCS',
    rate: 15.62,
    gst: 5,
  },
  {
    description: 'KURKURE MASALA MUNCH 90 GM',
    hsn: '19041090',
    qty: 40,
    unit: 'PCS',
    rate: 15.62,
    gst: 5,
  },
  {
    description: 'BRIT. GOOD DAY CASHEW COOKIES 200G',
    hsn: '19053100',
    qty: 36,
    unit: 'PCS',
    rate: 32.38,
    gst: 5,
  },
  {
    description: 'BROOKE BOND RED LABEL TEA 250G',
    hsn: '09024020',
    qty: 12,
    unit: 'PCS',
    rate: 122.86,
    gst: 5,
  },
  {
    description: 'NESCAFE CLASSIC COFFEE JAR 50G',
    hsn: '21011120',
    qty: 12,
    unit: 'PCS',
    rate: 143.33,
    gst: 5,
  },
  {
    description: 'COCA COLA PET BOTTLE 750ML',
    hsn: '22021010',
    qty: 24,
    unit: 'PCS',
    rate: 25.71,
    gst: 40,
  },
  {
    description: 'HAPPY TUMMY JEERA COOKIES 150G',
    hsn: '19053100',
    qty: 24,
    unit: 'PCS',
    rate: 22.86,
    gst: 5,
  },
];

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

/** Indian-system number to words: 1,23,456 -> "One Lakh Twenty Three Thousand Four Hundred Fifty Six". */
function inWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, '../../../docs/sample-bills');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'western-fmcg-invoice.pdf');

  const invoiceDate = new Date(Date.now() - 2 * 86_400_000);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(fs.createWriteStream(outFile));
  const left = 40;
  const width = doc.page.width - 80;

  // Supplier header
  doc.font('Helvetica-Bold').fontSize(18).text('WESTERN FMCG TRADERS', left, 40);
  doc.font('Helvetica').fontSize(9).fillColor('#333');
  doc.text('Plot J-112, Bhosari MIDC, Pune, Maharashtra 411026');
  doc.text('Ph: +91 98900 11223   Email: neha@westernfmcg.co.in');
  doc.text('GSTIN: 27AABFW3344P1Z2   State: Maharashtra (27)');
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#000')
    .text('TAX INVOICE', left, 40, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9);
  doc.text('Invoice No: WFT/26-27/04182', left, 62, { width, align: 'right' });
  doc.text(
    `Date: ${invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    left,
    74,
    { width, align: 'right' },
  );
  doc.text('Payment: 15 days credit', left, 86, { width, align: 'right' });

  doc
    .moveTo(left, 112)
    .lineTo(left + width, 112)
    .stroke('#999');
  doc.font('Helvetica-Bold').fontSize(9).text('Bill to', left, 120);
  doc.font('Helvetica').text('QuickBill Mart');
  doc.text('Shop 4, Baner Road, Pune, Maharashtra 411045');
  doc.text('GSTIN: 27AABCQ1234F1Z5');

  // Line items table
  const cols = [
    { label: '#', w: 22, align: 'left' as const },
    { label: 'Description of goods', w: 190, align: 'left' as const },
    { label: 'HSN', w: 58, align: 'left' as const },
    { label: 'Qty', w: 40, align: 'right' as const },
    { label: 'Rate', w: 55, align: 'right' as const },
    { label: 'GST %', w: 40, align: 'right' as const },
    { label: 'Amount (Rs)', w: width - 405, align: 'right' as const },
  ];
  let y = 180;
  const row = (values: string[], bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    let x = left;
    values.forEach((v, i) => {
      doc.text(v, x + 3, y + 5, { width: cols[i]!.w - 6, align: cols[i]!.align });
      x += cols[i]!.w;
    });
    y += 20;
  };
  doc.rect(left, y, width, 20).fill('#eeeeee').fillColor('#000');
  row(
    cols.map((c) => c.label),
    true,
  );

  const taxable = new Map<number, number>();
  let subtotal = 0;
  LINES.forEach((l, i) => {
    const amount = Math.round(l.qty * l.rate * 100) / 100;
    subtotal += amount;
    taxable.set(l.gst, (taxable.get(l.gst) ?? 0) + amount);
    row([
      String(i + 1),
      l.description,
      l.hsn,
      `${l.qty} ${l.unit}`,
      money(l.rate),
      String(l.gst),
      money(amount),
    ]);
    doc
      .moveTo(left, y)
      .lineTo(left + width, y)
      .stroke('#dddddd');
  });

  // Tax summary and totals
  y += 10;
  const totalsX = left + width - 220;
  const line = (labelText: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9);
    doc.text(labelText, totalsX, y, { width: 130 });
    doc.text(value, totalsX + 130, y, { width: 90, align: 'right' });
    y += bold ? 18 : 14;
  };
  line('Taxable value', money(subtotal));
  let tax = 0;
  for (const [rate, base] of [...taxable.entries()].sort(([a], [b]) => a - b)) {
    const half = Math.round(((base * rate) / 100 / 2) * 100) / 100;
    tax += half * 2;
    line(`CGST @ ${rate / 2}%`, money(half));
    line(`SGST @ ${rate / 2}%`, money(half));
  }
  const exact = subtotal + tax;
  const total = Math.round(exact);
  line('Round off', money(total - exact));
  doc
    .moveTo(totalsX, y)
    .lineTo(left + width, y)
    .stroke('#999');
  y += 6;
  line('Invoice total', money(total), true);

  doc
    .font('Helvetica')
    .fontSize(9)
    .text(`Amount in words: Rupees ${inWords(total)} Only`, left, y + 10, { width });
  doc.text('Goods once sold will not be taken back. Subject to Pune jurisdiction.', left, y + 30, {
    width,
  });
  doc
    .font('Helvetica-Bold')
    .text('For WESTERN FMCG TRADERS', left, y + 70, { width, align: 'right' });
  doc.font('Helvetica').text('Authorised signatory', left, y + 110, { width, align: 'right' });
  doc.end();

  console.log(
    `Wrote ${path.relative(process.cwd(), outFile)} (${LINES.length} lines, total Rs ${money(total)}).`,
  );
}

main();
