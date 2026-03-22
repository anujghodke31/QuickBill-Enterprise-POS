const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, orderCreationLimiter } = require('../middleware/rateLimiters');
const {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats,
} = require('../controllers/orderController');

// POST is public (storefront checkout) — rate-limited to prevent order spam
// GET /orders (admin) requires auth
router.route('/').post(orderCreationLimiter, createOrder).get(protect, apiLimiter, getOrders);
// /my is public — customers look up orders by email (no auth system for customers)
router.route('/my').get(orderCreationLimiter, getMyOrders);
router.route('/stats').get(protect, apiLimiter, getOrderStats);
router.route('/:id').get(protect, apiLimiter, getOrderById);
router.route('/:id/status').put(protect, apiLimiter, updateOrderStatus);

module.exports = router;
