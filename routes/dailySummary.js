const express = require('express');
const router = express.Router();
const { closeDayAndSave, getHistory } = require('../controllers/dailySummaryController');
const { protect } = require('../middleware/auth');

router.post('/close', protect, closeDayAndSave);
router.get('/history', protect, getHistory);

module.exports = router;
