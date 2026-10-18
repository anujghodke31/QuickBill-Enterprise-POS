const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
    },
});

const sendLowStockAlert = async (product) => {
    try {
        if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
            logger.warn({ event: 'mailer_config_missing', message: 'SMTP credentials or ADMIN_EMAIL missing' });
            return;
        }

        const info = await transporter.sendMail({
            from: `"QuickBill Alerts" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `🚨 Urgent: Low Stock Alert - ${product.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #d9534f;">Low Stock Warning</h2>
                    <p>The following product has dropped below its reorder threshold:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Product Name</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${product.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>SKU / Barcode</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${product.sku || product.barcode || 'N/A'}</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Stock</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: red;"><strong>${product.stock}</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reorder Level</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${product.lowStockThreshold}</td>
                        </tr>
                    </table>
                    <br/>
                    <a href="${process.env.FRONTEND_URL}/admin/inventory" 
                       style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                       View Inventory
                    </a>
                </div>
            `,
        });

        logger.info({ event: 'low_stock_email_sent', messageId: info.messageId, product: product.name });
    } catch (error) {
        logger.error({ event: 'mailer_failed', error: error.message });
    }
};

module.exports = { sendLowStockAlert };
