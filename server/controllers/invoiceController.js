const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { generateReceiptPdf } = require('../utils/receiptGenerator');

const availableNotes = [2000, 500, 100, 20, 10, 5, 1];
const LOYALTY_LOOKBACK_DAYS = 30;
const LOYALTY_MIN_PURCHASES = 3;
const LOYALTY_DISCOUNT_RATE = 0.1;

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const calculateChange = (amount) => {
    const result = {};
    let remaining = Math.floor(roundCurrency(amount));
    for (const note of availableNotes) {
        if (remaining >= note) {
            const count = Math.floor(remaining / note);
            remaining %= note;
            if (count > 0) {
                result[note] = count;
            }
        }
    }
    return result;
};

const getCustomerLoyaltyStatus = async (customerId) => {
    if (!customerId) {
        return { eligible: false, purchaseCount: 0, discountPercent: 0 };
    }

    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - LOYALTY_LOOKBACK_DAYS);

    const purchaseCount = await Invoice.countDocuments({
        customer: customerId,
        timestamp: { $gte: lookbackStart },
    });

    const eligible = purchaseCount >= LOYALTY_MIN_PURCHASES;

    return {
        eligible,
        purchaseCount,
        discountPercent: eligible ? LOYALTY_DISCOUNT_RATE * 100 : 0,
    };
};

// @desc    Create new invoice (Checkout)
// @route   POST /api/invoices
const createInvoice = async (req, res) => {
    const { cartItems, cashGiven, customerId, paymentMethod } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: 'No items in cart' });
    }

    try {
        const normalizedItems = cartItems.filter((item) => item && item.productId);

        if (normalizedItems.length === 0) {
            return res.status(400).json({ message: 'Cart contains invalid items' });
        }

        const requestedQuantities = new Map();
        for (const item of normalizedItems) {
            const productId = String(item.productId);
            const quantity = Number(item.quantity);

            if (!Number.isFinite(quantity) || quantity <= 0) {
                return res.status(400).json({ message: 'Invalid item quantity in cart' });
            }

            requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
        }

        const productIds = [...requestedQuantities.keys()];
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((product) => [String(product._id), product]));

        let subTotal = 0;
        const invoiceItems = [];

        for (const [productId, quantity] of requestedQuantities.entries()) {
            const product = productMap.get(productId);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${productId}` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }

            subTotal += product.price * quantity;
            invoiceItems.push({
                productId: product._id,
                name: product.name,
                quantity,
                price: product.price,
            });
        }

        subTotal = roundCurrency(subTotal);

        const loyalty = await getCustomerLoyaltyStatus(customerId);
        const discount = loyalty.eligible ? roundCurrency(subTotal * LOYALTY_DISCOUNT_RATE) : 0;
        const totalAmount = roundCurrency(subTotal - discount);

        const finalPaymentMethod = paymentMethod || 'Cash';
        let paymentDetails = {};

        if (finalPaymentMethod === 'Cash') {
            const parsedCash = Number(cashGiven);
            if (!Number.isFinite(parsedCash) || parsedCash < totalAmount) {
                return res.status(400).json({ message: 'Insufficient cash' });
            }

            paymentDetails = {
                cashGiven: parsedCash,
                changeReturned: roundCurrency(parsedCash - totalAmount),
            };
        }

        for (const item of invoiceItems) {
            const product = productMap.get(String(item.productId));
            product.stock -= item.quantity;
            await product.save();
        }

        if (customerId) {
            const customer = await Customer.findById(customerId);
            if (customer) {
                customer.totalSpent = roundCurrency((customer.totalSpent || 0) + totalAmount);
                customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(totalAmount / 100);
                await customer.save();
            }
        }

        const invoice = new Invoice({
            items: invoiceItems,
            subTotal,
            discount,
            totalAmount,
            customer: customerId || null,
            paymentMethod: finalPaymentMethod,
            paymentDetails,
            user: req.user._id,
        });

        const createdInvoice = await invoice.save();

        let notesReturned = {};
        if (finalPaymentMethod === 'Cash') {
            notesReturned = calculateChange(paymentDetails.changeReturned);
        }

        res.status(201).json({
            success: true,
            invoice: createdInvoice,
            notesReturned,
            loyalty,
        });
    } catch (error) {
        res.status(500).json({ message: 'Transaction failed', error: error.message });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
const getInvoices = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const invoices = await Invoice.find(filter)
            .populate('customer', 'name phone')
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get loyalty eligibility for a customer
// @route   GET /api/invoices/loyalty/:customerId
const getLoyaltyStatus = async (req, res) => {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: 'Invalid customer id' });
    }

    try {
        const customer = await Customer.findById(customerId).select('_id');
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const loyalty = await getCustomerLoyaltyStatus(customerId);
        res.json(loyalty);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Stream invoice receipt as PDF
// @route   GET /api/invoices/:id/receipt
const getInvoiceReceipt = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const invoice = await Invoice.findOne(query).populate('customer', 'name phone');
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found or unauthorized' });
        }

        const fileName = `receipt-${invoice.invoiceNumber || invoice._id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        generateReceiptPdf(invoice, res);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getLoyaltyStatus,
    getInvoiceReceipt,
};
