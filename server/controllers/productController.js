const Product = require('../models/Product');

// @desc    Get all products (admin)
// @route   GET /api/products
// @access  Admin
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get published products for storefront
// @route   GET /api/products/storefront
// @access  Public
const getPublishedProducts = async (req, res) => {
    try {
        const { category, brand, minPrice, maxPrice, search, sort, page = 1, limit = 12 } = req.query;
        const filter = { isPublished: true };

        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') sortOption = { price: 1 };
        else if (sort === 'price_desc') sortOption = { price: -1 };
        else if (sort === 'rating') sortOption = { 'ratings.average': -1 };
        else if (sort === 'name') sortOption = { name: 1 };

        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            Product.find(filter).sort(sortOption).skip(skip).limit(Number(limit)),
            Product.countDocuments(filter)
        ]);

        res.json({
            products,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product by ID (storefront)
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product/search by barcode
// @route   GET /api/products/search?barcode=...
// @access  Admin
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
// @access  Admin
const createProduct = async (req, res) => {
    const {
        name, price, stock, barcode, category,
        manufacturingDate, expiryDate,
        description, images, brand, tags, isPublished, compareAtPrice, sku
    } = req.body;

    try {
        const product = new Product({
            name,
            price,
            stock,
            barcode,
            category,
            manufacturingDate: manufacturingDate || null,
            expiryDate: expiryDate || null,
            description: description || '',
            images: images || [],
            brand: brand || '',
            tags: tags || [],
            isPublished: isPublished || false,
            compareAtPrice: compareAtPrice || null,
            sku: sku || undefined,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
    const {
        name, price, stock, barcode, category,
        manufacturingDate, expiryDate,
        description, images, brand, tags, isPublished, compareAtPrice, sku
    } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.price = price !== undefined ? price : product.price;
            product.stock = stock !== undefined ? stock : product.stock;
            product.barcode = barcode !== undefined ? barcode : product.barcode;
            product.category = category || product.category;
            product.manufacturingDate = manufacturingDate !== undefined ? manufacturingDate : product.manufacturingDate;
            product.expiryDate = expiryDate !== undefined ? expiryDate : product.expiryDate;
            product.description = description !== undefined ? description : product.description;
            product.brand = brand !== undefined ? brand : product.brand;
            product.sku = sku !== undefined ? sku : product.sku;
            product.compareAtPrice = compareAtPrice !== undefined ? compareAtPrice : product.compareAtPrice;
            if (images !== undefined) product.images = images;
            if (tags !== undefined) product.tags = tags;
            if (isPublished !== undefined) product.isPublished = isPublished;

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
// @access  Admin
const getAlerts = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        const expiringSoon = await Product.find({
            expiryDate: { $ne: null, $lte: thirtyDaysLater }
        }).sort({ expiryDate: 1 });

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

// @desc    Get all unique categories (storefront)
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        const categories = await Product.distinct('category', { isPublished: true });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    getPublishedProducts,
    getProductById,
    getProductByBarcode,
    createProduct,
    updateProduct,
    getAlerts,
    getCategories
};
