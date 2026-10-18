const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { sendLowStockAlert } = require('../utils/mailer');
const redisClient = require('../config/redis');

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

        // ── Phase 5.2 Emit Socket.io 'new_order' event ────────────
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('new_order', {
                    orderId: savedOrder._id,
                    total: savedOrder.totalAmount,
                    customerName: typeof customer === 'object' ? customer.name : 'Walk-in',
                    timestamp: savedOrder.createdAt
                });
            }
        } catch(ioErr) {
            // non-fatal
        }

        // ── Phase 5.3 + 5.2 Low Stock Email Alerts & Sockets ──────
        try {
            const io = req.app.get('io');
            for (const item of items) {
                const updatedProduct = await Product.findById(item.product);
                if (updatedProduct && updatedProduct.stock <= updatedProduct.lowStockThreshold) {
                    
                    if (io) io.emit('stock_alert', { product: updatedProduct.name, stock: updatedProduct.stock });

                    // 1 alert per 24 hours throttling
                    const redisKey = `stock_alert:${updatedProduct._id}`;
                    const hasAlerted = await redisClient.get(redisKey);
                    
                    if (!hasAlerted) {
                        await sendLowStockAlert(updatedProduct);
                        await redisClient.setex(redisKey, 86400, 'true'); // 24 hours
                    }
                }
            }
        } catch (stockErr) {
            // non-fatal
        }

        // ── Phase 5.4 Points processing  ──────────────────
        try {
            if (customer && customer.email) {
                const matchCust = await Customer.findOne({ email: customer.email });
                if (matchCust) {
                    // 1 point per 10 rupees logic (example default)
                    const pointsPerRupee = 10;
                    const pointsEarned = Math.floor(savedOrder.totalAmount / pointsPerRupee);
                    matchCust.loyaltyPoints += pointsEarned;
                    matchCust.totalPointsEarned += pointsEarned;
                    matchCust.totalSpent += savedOrder.totalAmount;
                    matchCust.pointsHistory.push({
                        points: pointsEarned,
                        reason: 'Purchase Reward',
                        orderId: savedOrder._id
                    });
                    await matchCust.save();
                    
                    const io = req.app.get('io');
                    if (io) io.emit('points_earned', { customer: matchCust.name, points: pointsEarned });
                }
            }
        } catch (pointsErr) {}

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
