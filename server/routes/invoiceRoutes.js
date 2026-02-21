const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getLoyaltyStatus,
  getInvoiceReceipt,
} = require('../controllers/invoiceController');

router.route('/').post(createInvoice).get(getInvoices);
router.get('/loyalty/:customerId', getLoyaltyStatus);
router.get('/:id/receipt', getInvoiceReceipt);

module.exports = router;
