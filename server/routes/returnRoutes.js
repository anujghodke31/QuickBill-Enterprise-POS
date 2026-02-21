const express = require('express');
const router = express.Router();
const {
  getReturns,
  getInvoiceForReturn,
  createReturn,
} = require('../controllers/returnController');

router.route('/').get(getReturns).post(createReturn);
router.get('/invoice/:query', getInvoiceForReturn);

module.exports = router;
