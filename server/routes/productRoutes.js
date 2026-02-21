const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  getProductByBarcode,
  getAlerts,
} = require('../controllers/productController');

router.route('/').get(getProducts).post(createProduct);
router.route('/alerts').get(getAlerts);
router.route('/search').get(getProductByBarcode);
router.route('/:id').put(updateProduct);

module.exports = router;
