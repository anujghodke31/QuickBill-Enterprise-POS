const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product/search by barcode
// @route   GET /api/products/search?barcode=...
// @access  Public
const getProductByBarcode = async (req, res) => {
    const { barcode } = req.query;
    try {
        const product = await Product.findOne({ barcode });
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Create a product
// @route   POST /api/products
// @access  Public (should be private)
const createProduct = async (req, res) => {
    const { name, price, stock, barcode, category, manufacturingDate, expiryDate } = req.body;

    try {
        const product = new Product({
            name,
            price,
            stock,
            barcode,
            category,
            manufacturingDate: manufacturingDate || null,
            expiryDate: expiryDate || null,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Public
const updateProduct = async (req, res) => {
    const { name, price, stock, barcode, category, manufacturingDate, expiryDate } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.price = price || product.price;
            product.stock = stock !== undefined ? stock : product.stock;
            product.barcode = barcode || product.barcode;
            product.category = category || product.category;
            product.manufacturingDate = manufacturingDate !== undefined ? manufacturingDate : product.manufacturingDate;
            product.expiryDate = expiryDate !== undefined ? expiryDate : product.expiryDate;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get expiry alerts (expiring within 30 days) + low stock items
// @route   GET /api/products/alerts
const getAlerts = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        // Products expiring within 30 days (that have an expiryDate set)
        const expiringSoon = await Product.find({
            expiryDate: { $ne: null, $lte: thirtyDaysLater }
        }).sort({ expiryDate: 1 });

        // Products with stock below threshold
        const lowStock = await Product.find({
            $expr: { $lt: ['$stock', '$lowStockThreshold'] }
        }).sort({ stock: 1 });

        res.json({
            expiringSoon: expiringSoon.map(p => ({
                _id: p._id,
                name: p.name,
                expiryDate: p.expiryDate,
                stock: p.stock,
                expired: p.expiryDate <= now,
            })),
            lowStock: lowStock.map(p => ({
                _id: p._id,
                name: p.name,
                stock: p.stock,
                lowStockThreshold: p.lowStockThreshold,
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    getProductByBarcode,
    createProduct,
    updateProduct,
    getAlerts
};
