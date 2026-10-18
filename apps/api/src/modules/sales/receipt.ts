import PDFDocument from 'pdfkit';
import { gstComponent, type SaleDTO } from '@quickbill/shared';
import { STORE } from '../../config/store';

// 80 mm thermal roll. The standard PDF fonts have no ₹ glyph, so amounts use "Rs".
const WIDTH = 226;
const MARGIN = 12;
const INNER = WIDTH - MARGIN * 2;

const rs = (paise: number) =>
  `Rs ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function gstSummary(sale: SaleDTO) {
  const ratio = sale.subtotal === 0 ? 0 : sale.total / sale.subtotal;
  const byRate = new Map<number, { taxable: number; tax: number }>();
  for (const item of sale.items) {
    const net = Math.round(item.lineTotal * ratio);
    const tax = gstComponent(net, item.taxRate);
    const entry = byRate.get(item.taxRate) ?? { taxable: 0, tax: 0 };
    entry.taxable += net - tax;
    entry.tax += tax;
    byRate.set(item.taxRate, entry);
  }
  return [...byRate.entries()].filter(([rate]) => rate > 0).sort(([a], [b]) => a - b);
}

export function renderReceipt(sale: SaleDTO): PDFKit.PDFDocument {
  const height = 360 + sale.items.length * 26 + gstSummary(sale).length * 12;
  const doc = new PDFDocument({ size: [WIDTH, height], margin: MARGIN });

  const row = (left: string, right: string, opts: { bold?: boolean; size?: number } = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8);
    const y = doc.y;
    doc.text(left, MARGIN, y, { width: INNER * 0.62 });
    const leftBottom = doc.y;
    doc.text(right, MARGIN, y, { width: INNER, align: 'right' });
    doc.y = Math.max(leftBottom, doc.y);
  };
  const rule = () => {
    doc.moveDown(0.3);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(WIDTH - MARGIN, doc.y)
      .dash(2, { space: 2 })
      .strokeColor('#888')
      .stroke()
      .undash();
    doc.moveDown(0.4);
  };

  doc.font('Helvetica-Bold').fontSize(12).text(STORE.name, { align: 'center' });
  doc.font('Helvetica').fontSize(7);
  for (const line of STORE.addressLines) doc.text(line, { align: 'center' });
  doc.text(`Ph ${STORE.phone}  ·  GSTIN ${STORE.gstin}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(8).text('TAX INVOICE', { align: 'center' });
  rule();

  const when = new Date(sale.createdAt).toLocaleString('en-IN', {
    timeZone: STORE.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  row(`Bill ${sale.number}`, when);
  row(`Cashier: ${sale.cashier.name}`, sale.paymentMethod);
  if (sale.customer) row(`Customer: ${sale.customer.name}`, sale.customer.phone ?? '');
  rule();

  for (const item of sale.items) {
    doc.font('Helvetica').fontSize(8).text(item.name, MARGIN, doc.y, { width: INNER });
    row(`  ${item.quantity} x ${rs(item.unitPrice)}`, rs(item.lineTotal));
  }
  rule();

  row('Subtotal', rs(sale.subtotal));
  if (sale.discount > 0) row(`Points redeemed (${sale.pointsRedeemed})`, `- ${rs(sale.discount)}`);
  row('TOTAL', rs(sale.total), { bold: true, size: 11 });
  if (sale.amountTendered !== null) {
    row('Cash received', rs(sale.amountTendered));
    row('Change', rs(sale.changeDue ?? 0));
  }

  const gst = gstSummary(sale);
  if (gst.length > 0) {
    rule();
    doc.font('Helvetica-Bold').fontSize(7).text('GST included in total');
    for (const [rate, { taxable, tax }] of gst) {
      const half = rs(Math.round(tax / 2));
      row(`${rate}% on ${rs(taxable)}`, `CGST ${half} + SGST ${half}`, { size: 7 });
    }
  }

  if (sale.pointsEarned > 0) {
    rule();
    doc.font('Helvetica').fontSize(8).text(`You earned ${sale.pointsEarned} loyalty points!`, {
      align: 'center',
    });
  }
  rule();
  doc.font('Helvetica').fontSize(7).text('Thank you for shopping with us.', { align: 'center' });
  doc.text('Returns accepted within 7 days with this bill.', { align: 'center' });
  doc.end();
  return doc;
}
