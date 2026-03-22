const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getProducts, createProduct, updateProduct,
    getProductByBarcode, getAlerts,
    getPublishedProducts, getProductById, getCategories
} = require('../controllers/productController');

router.route('/').get(protect, getProducts).post(protect, createProduct);
router.route('/storefront').get(getPublishedProducts); // Public for storefront
router.route('/categories').get(getCategories); // Public for storefront
router.route('/alerts').get(protect, getAlerts);
router.route('/search').get(protect, getProductByBarcode);
router.route('/:id').get(protect, getProductById).put(protect, updateProduct);

module.exports = router;

