const PDFDocument = require('pdfkit');

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => new Date(value || Date.now()).toLocaleString('en-IN');

const addLine = (doc, label, value, strong = false) => {
    if (strong) {
        doc.font('Helvetica-Bold');
    } else {
        doc.font('Helvetica');
    }
    doc.text(label, 40, doc.y, { continued: true });
    doc.text(value, { align: 'right' });
};

const generateReceiptPdf = (invoice, outputStream) => {
    const doc = new PDFDocument({ size: 'A6', margin: 40 });
    doc.pipe(outputStream);

    doc.font('Helvetica-Bold').fontSize(14).text('QuickBill POS', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).text(`Invoice: ${invoice.invoiceNumber || invoice._id}`, { align: 'center' });
    doc.text(formatDate(invoice.timestamp), { align: 'center' });

    if (invoice.customer?.name) {
        doc.moveDown(0.2);
        doc.text(`Customer: ${invoice.customer.name}`, { align: 'center' });
    }

    doc.moveDown(0.8);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#cccccc');
    doc.moveDown(0.6);

    doc.fontSize(9).font('Helvetica-Bold').text('Item', 40, doc.y, { continued: true });
    doc.text('Amount', { align: 'right' });
    doc.moveDown(0.2);
    doc.font('Helvetica');

    (invoice.items || []).forEach((item) => {
        const lineAmount = Number(item.price || 0) * Number(item.quantity || 0);
        doc.text(`${item.name} x${item.quantity}`, 40, doc.y, { continued: true });
        doc.text(formatCurrency(lineAmount), { align: 'right' });
    });

    doc.moveDown(0.6);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#cccccc');
    doc.moveDown(0.6);

    addLine(doc, 'Subtotal', formatCurrency(invoice.subTotal || invoice.totalAmount));
    if (Number(invoice.discount || 0) > 0) {
        addLine(doc, 'Discount', `- ${formatCurrency(invoice.discount)}`);
    }
    addLine(doc, 'Total', formatCurrency(invoice.totalAmount), true);

    doc.moveDown(0.4);
    addLine(doc, 'Payment', invoice.paymentMethod || 'Cash');

    if (invoice.paymentMethod === 'Cash') {
        addLine(doc, 'Cash Given', formatCurrency(invoice.paymentDetails?.cashGiven || 0));
        addLine(doc, 'Change', formatCurrency(invoice.paymentDetails?.changeReturned || 0));
    }

    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(8).fillColor('#555555').text('Thank you for shopping with QuickBill!', {
        align: 'center',
    });

    doc.end();
};

module.exports = { generateReceiptPdf };
