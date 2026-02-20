const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// Utility for calculating notes
const availableNotes = [2000, 500, 100, 20, 10, 5, 1];
const calculateChange = (amount) => {
    const result = {};
    let remaining = amount;
    for (let note of availableNotes) {
        if (remaining >= note) {
            const count = Math.floor(remaining / note);
            remaining %= note;
            if (count > 0) result[note] = count;
        }
    }
    return result;
};

// @desc    Create new invoice (Checkout)
// @route   POST /api/invoices
const createInvoice = async (req, res) => {
    const { cartItems, cashGiven, customerId, paymentMethod } = req.body;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: 'No items in cart' });
    }

    try {
        let totalAmount = 0;
        const invoiceItems = [];

        // Process items and check stock
        for (const item of cartItems) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.name}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }

            // Deduct stock
            product.stock -= item.quantity;
            await product.save();

            totalAmount += product.price * item.quantity;
            invoiceItems.push({
                productId: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price
            });
        }

        // Payment Logic
        let paymentDetails = {};
        if (paymentMethod === 'Cash') {
            if (cashGiven < totalAmount) {
                return res.status(400).json({ message: 'Insufficient cash' });
            }
            const change = cashGiven - totalAmount;
            paymentDetails = {
                cashGiven,
                changeReturned: change,
                // notesReturned map isn't stored in Schema but we return it in response
            };
        }

        // Update Customer Logic
        if (customerId) {
            const customer = await Customer.findById(customerId);
            if (customer) {
                customer.totalSpent += totalAmount;
                customer.loyaltyPoints += Math.floor(totalAmount / 100); // 1 point per 100 spent
                await customer.save();
            }
        }

        const invoice = new Invoice({
            items: invoiceItems,
            totalAmount,
            subTotal: totalAmount, // Tax logic can be added later
            customer: customerId || null,
            paymentMethod: paymentMethod || 'Cash',
            paymentDetails
        });

        const createdInvoice = await invoice.save();

        // Calculate notes if cash
        let notesReturned = {};
        if (paymentMethod === 'Cash') {
            notesReturned = calculateChange(paymentDetails.changeReturned);
        }

        res.status(201).json({
            success: true,
            invoice: createdInvoice,
            notesReturned
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Transaction Failed', error: error.message });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({})
            .populate('customer', 'name phone')
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createInvoice, getInvoices };
