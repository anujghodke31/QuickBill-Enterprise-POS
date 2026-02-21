const mongoose = require('mongoose');
const Return = require('../models/Return');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const buildReturnedQuantityMap = (returns) => {
  const returnedQuantities = {};

  for (const returnRecord of returns) {
    for (const item of returnRecord.items || []) {
      const productId = String(item.productId);
      returnedQuantities[productId] =
        (returnedQuantities[productId] || 0) + Number(item.quantity || 0);
    }
  }

  return returnedQuantities;
};

const getPurchasedItemMap = (invoice) => {
  const purchasedMap = new Map();

  for (const item of invoice.items || []) {
    const productId = String(item.productId);
    const existing = purchasedMap.get(productId) || {
      productId,
      name: item.name,
      price: Number(item.price || 0),
      quantity: 0,
    };
    existing.quantity += Number(item.quantity || 0);
    purchasedMap.set(productId, existing);
  }

  return purchasedMap;
};

// @desc    Get all return records
// @route   GET /api/returns
const getReturns = async (req, res) => {
  try {
    const returns = await Return.find({})
      .sort({ timestamp: -1 })
      .populate('invoiceId', 'invoiceNumber timestamp')
      .limit(200);

    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Find invoice details for return by invoice number or id
// @route   GET /api/returns/invoice/:query
const getInvoiceForReturn = async (req, res) => {
  const query = (req.params.query || '').trim();

  if (!query) {
    return res.status(400).json({ message: 'Invoice id or invoice number is required' });
  }

  try {
    let invoice = await Invoice.findOne({ invoiceNumber: query }).populate(
      'customer',
      'name phone'
    );

    if (!invoice && mongoose.Types.ObjectId.isValid(query)) {
      invoice = await Invoice.findById(query).populate('customer', 'name phone');
    }

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const priorReturns = await Return.find({ invoiceId: invoice._id });
    const returnedQuantities = buildReturnedQuantityMap(priorReturns);

    res.json({ invoice, returnedQuantities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create return record and restore stock
// @route   POST /api/returns
const createReturn = async (req, res) => {
  const { invoiceId, items, reason } = req.body;

  if (!invoiceId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invoice and returned items are required' });
  }

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const purchasedMap = getPurchasedItemMap(invoice);
    const priorReturns = await Return.find({ invoiceId: invoice._id });
    const returnedQuantities = buildReturnedQuantityMap(priorReturns);

    const requestedQuantities = new Map();
    for (const item of items) {
      const productId = String(item.productId || '');
      const quantity = Number(item.quantity);
      const purchased = purchasedMap.get(productId);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid return item payload' });
      }

      if (!purchased) {
        return res
          .status(400)
          .json({ message: `Product not found in original invoice: ${productId}` });
      }

      const alreadyRequested = requestedQuantities.get(productId) || 0;
      const newRequestedQty = alreadyRequested + quantity;
      const previouslyReturnedQty = returnedQuantities[productId] || 0;

      if (newRequestedQty + previouslyReturnedQty > purchased.quantity) {
        return res.status(400).json({
          message: `Return quantity exceeds sold quantity for ${purchased.name}`,
        });
      }

      requestedQuantities.set(productId, newRequestedQty);
    }

    const returnItems = [];
    let refundAmount = 0;

    for (const [productId, quantity] of requestedQuantities.entries()) {
      const purchased = purchasedMap.get(productId);
      const product = await Product.findById(productId);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product missing from inventory: ${purchased.name}` });
      }

      product.stock += quantity;
      await product.save();

      refundAmount += purchased.price * quantity;
      returnItems.push({
        productId,
        name: purchased.name,
        quantity,
        price: purchased.price,
      });
    }

    refundAmount = roundCurrency(refundAmount);

    const createdReturn = await Return.create({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber || String(invoice._id),
      items: returnItems,
      reason: reason || '',
      refundAmount,
    });

    if (invoice.customer) {
      const customer = await Customer.findById(invoice.customer);
      if (customer) {
        customer.totalSpent = Math.max(0, roundCurrency((customer.totalSpent || 0) - refundAmount));
        customer.loyaltyPoints = Math.max(
          0,
          (customer.loyaltyPoints || 0) - Math.floor(refundAmount / 100)
        );
        await customer.save();
      }
    }

    res.status(201).json(createdReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReturns,
  getInvoiceForReturn,
  createReturn,
};
