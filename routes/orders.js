const express = require('express');
const router = express.Router();
const {
  getTables, createTable, updateTableStatus,
  getOrders, getOrderById, createOrder,
  addItemToOrder, updateOrderItemStatus, updateOrderStatus, removeItemFromOrder,
} = require('../controllers/orderController');

// ---- Mesas ----
router.get('/tables', getTables);
router.post('/tables', createTable);
router.patch('/tables/:id/status', updateTableStatus);

// ---- Órdenes ----
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);

// ---- Items de Orden ----
router.post('/:id/items', addItemToOrder);
router.patch('/:id/items/:item_id/status', updateOrderItemStatus);
router.delete('/:id/items/:item_id', removeItemFromOrder);

module.exports = router;
