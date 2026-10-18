const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, orderCreationLimiter } = require('../middleware/rateLimiters');
const { cache } = require('../middleware/cacheMiddleware');
const {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats,
} = require('../controllers/orderController');

router.route('/')
    .post(orderCreationLimiter, createOrder)
    .get(protect, apiLimiter, getOrders);

router.route('/my')
    .get(orderCreationLimiter, getMyOrders);

// ── Phase 2.2 Redis Caching ───────────
router.route('/stats')
    .get(protect, apiLimiter, cache(60), getOrderStats); // 1 minute TTL

router.route('/:id')
    .get(protect, apiLimiter, getOrderById);

router.route('/:id/status')
    .put(protect, apiLimiter, updateOrderStatus);

module.exports = router;
