const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats,
} = require('../controllers/orderController');

// Public routes  
router.route('/').post(createOrder).get(getOrders);
router.route('/my').get(getMyOrders);
router.route('/stats').get(getOrderStats);
router.route('/:id').get(getOrderById);
router.route('/:id/status').put(updateOrderStatus);

module.exports = router;
