const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, storefrontLimiter } = require('../middleware/rateLimiters');
const {
    getProducts, createProduct, updateProduct,
    getProductByBarcode, getAlerts,
    getPublishedProducts, getProductById, getCategories
} = require('../controllers/productController');

router.route('/').get(protect, apiLimiter, getProducts).post(protect, apiLimiter, createProduct);
router.route('/storefront').get(storefrontLimiter, getPublishedProducts); // Public for storefront
router.route('/categories').get(storefrontLimiter, getCategories);       // Public for storefront
router.route('/alerts').get(protect, apiLimiter, getAlerts);
router.route('/search').get(protect, apiLimiter, getProductByBarcode);
router.route('/:id').get(storefrontLimiter, getProductById).put(protect, apiLimiter, updateProduct);

module.exports = router;

