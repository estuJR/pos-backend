const express = require('express');
const router = express.Router();
const {
  getSummaryReport,
  getTopProducts,
  getSalesByCategory,
  getDailySales,
  getTablePerformance,
} = require('../controllers/reportController');

router.get('/summary', getSummaryReport);
router.get('/top-products', getTopProducts);
router.get('/by-category', getSalesByCategory);
router.get('/daily-sales', getDailySales);
router.get('/table-performance', getTablePerformance);

module.exports = router;
