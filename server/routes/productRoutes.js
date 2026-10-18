const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, storefrontLimiter } = require('../middleware/rateLimiters');
const { cache } = require('../middleware/cacheMiddleware');
const {
    getProducts, createProduct, updateProduct,
    getProductByBarcode, getAlerts,
    getPublishedProducts, getProductById, getCategories
} = require('../controllers/productController');

// ── Phase 2.2 Redis Caching applied to GET endpoints ─────────────
router.route('/')
    .get(protect, apiLimiter, cache(300), getProducts) // 5 minutes TTL
    .post(protect, apiLimiter, createProduct);

router.route('/storefront')
    .get(storefrontLimiter, cache(300), getPublishedProducts); // 5 minutes TTL

router.route('/categories')
    .get(storefrontLimiter, cache(600), getCategories); // 10 minutes TTL

router.route('/alerts')
    .get(protect, apiLimiter, getAlerts);

router.route('/search')
    .get(protect, apiLimiter, getProductByBarcode);

router.route('/:id')
    .get(storefrontLimiter, getProductById)
    .put(protect, apiLimiter, updateProduct);

module.exports = router;
