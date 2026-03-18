const express = require('express');
const router = express.Router();
const { processPayment, getPayments, getPaymentById, refundPayment } = require('../controllers/paymentController');

router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/', processPayment);
router.patch('/:id/refund', refundPayment);

module.exports = router;
