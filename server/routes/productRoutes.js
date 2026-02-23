const express = require('express');
const router = express.Router();
const {
    getProducts, createProduct, updateProduct,
    getProductByBarcode, getAlerts,
    getPublishedProducts, getProductById, getCategories
} = require('../controllers/productController');

router.route('/').get(getProducts).post(createProduct);
router.route('/storefront').get(getPublishedProducts);
router.route('/categories').get(getCategories);
router.route('/alerts').get(getAlerts);
router.route('/search').get(getProductByBarcode);
router.route('/:id').get(getProductById).put(updateProduct);

module.exports = router;

