const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')
const { QueryTypes } = require('sequelize')

// GET /api/cocina/order-number/:orderId
// Devuelve (o crea) el número correlativo de cocina para una orden
router.get('/order-number/:orderId', async (req, res) => {
  const { orderId } = req.params
  try {
    // ¿Ya tiene número asignado?
    const existing = await sequelize.query(
      'SELECT cocina_number FROM cocina_order_numbers WHERE order_id = ?',
      { replacements: [orderId], type: QueryTypes.SELECT }
    )
    if (existing.length > 0) {
      return res.json({ success: true, cocina_number: existing[0].cocina_number })
    }

    // No tiene — incrementar el contador y asignar
    await sequelize.query(
      'UPDATE cocina_counter SET last_number = last_number + 1 WHERE id = 1'
    )
    const [{ last_number }] = await sequelize.query(
      'SELECT last_number FROM cocina_counter WHERE id = 1',
      { type: QueryTypes.SELECT }
    )
    await sequelize.query(
      'INSERT INTO cocina_order_numbers (order_id, cocina_number) VALUES (?, ?)',
      { replacements: [orderId, last_number] }
    )
    return res.json({ success: true, cocina_number: last_number })
  } catch (err) {
    console.error('Error cocina number:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/cocina/history — historial de órdenes de cocina
router.get('/history', async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT cn.cocina_number, cn.order_id, cn.created_at,
              o.status, t.name AS table_name
       FROM cocina_order_numbers cn
       LEFT JOIN orders o ON o.id = cn.order_id
       LEFT JOIN tables t ON t.id = o.table_id
       ORDER BY cn.cocina_number DESC
       LIMIT 100`,
      { type: QueryTypes.SELECT }
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router