const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getInventory, updateStock, getLowStock } = require('../controllers/inventoryController');

router.get('/', protect, getInventory);
router.get('/low', protect, getLowStock);
router.put('/:id/stock', protect, updateStock);

module.exports = router;
