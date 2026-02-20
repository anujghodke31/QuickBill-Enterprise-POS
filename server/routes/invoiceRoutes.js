const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices } = require('../controllers/invoiceController');

router.route('/').post(createInvoice).get(getInvoices);

module.exports = router;
