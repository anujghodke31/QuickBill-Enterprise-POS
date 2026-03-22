const Order = require('../models/Order');
const Product = require('../models/Product');

// Create a new order (storefront)
const createOrder = async (req, res) => {
    try {
        const { customer, shippingAddress, items, paymentMethod, totalAmount } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Verify stock and deduct
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.name} not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }
        }

        // Deduct stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        const order = new Order({
            customer,
            shippingAddress,
            items,
            paymentMethod: paymentMethod || 'cod',
            totalAmount,
            status: 'pending',
            paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
        });

        const savedOrder = await order.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all orders (admin)
const getOrders = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get orders by customer email
const getMyOrders = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.json([]);
        }
        const orders = await Order.find({ 'customer.email': email }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single order
const getOrderById = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const order = await Order.findOne(query);
        if (!order) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update order status (admin)
const updateOrderStatus = async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.user.role !== 'admin') query.user = req.user._id;

        const { status, paymentStatus } = req.body;
        const order = await Order.findOne(query);
        if (!order) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }

        const previousStatus = order.status;

        if (status) order.status = status;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        // If cancelled, restore stock
        if (status === 'cancelled' && previousStatus !== 'cancelled') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        const updated = await order.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get order stats (admin dashboard)
const getOrderStats = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
        const totalOrders = await Order.countDocuments(filter);
        const pendingOrders = await Order.countDocuments({ ...filter, status: 'pending' });
        
        const matchStage = { status: { $ne: 'cancelled' } };
        if (req.user.role !== 'admin') matchStage.user = req.user._id;

        const totalRevenue = await Order.aggregate([
            { $match: matchStage },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const recentOrders = await Order.find(filter).sort({ createdAt: -1 }).limit(5);

        res.json({
            totalOrders,
            pendingOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            recentOrders,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats,
};
