const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')
const { QueryTypes } = require('sequelize')

// GET /api/cocina/order-number/:orderId
// Devuelve (o crea) el número correlativo de cocina para una orden
router.get('/order-number/:orderId', async (req, res) => {
  const { orderId } = req.params
  try {
    const existing = await sequelize.query(
      'SELECT cocina_number FROM cocina_order_numbers WHERE order_id = ?',
      { replacements: [orderId], type: QueryTypes.SELECT }
    )
    if (existing.length > 0) {
      return res.json({ success: true, cocina_number: existing[0].cocina_number })
    }

    // Obtener datos de la orden para guardar snapshot
    const orderData = await sequelize.query(
      `SELECT o.id, o.opened_at, t.name AS table_name,
              JSON_ARRAYAGG(JSON_OBJECT(
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'notes', oi.notes
              )) AS items
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
       GROUP BY o.id, o.opened_at, t.name`,
      { replacements: [orderId], type: QueryTypes.SELECT }
    )

    const order = orderData[0] || {}

    // Incrementar contador
    await sequelize.query(
      'UPDATE cocina_counter SET last_number = last_number + 1 WHERE id = 1'
    )
    const [{ last_number }] = await sequelize.query(
      'SELECT last_number FROM cocina_counter WHERE id = 1',
      { type: QueryTypes.SELECT }
    )

    await sequelize.query(
      'INSERT INTO cocina_order_numbers (order_id, cocina_number, table_name, items_snapshot) VALUES (?, ?, ?, ?)',
      { replacements: [orderId, last_number, order.table_name || 'Sin mesa', JSON.stringify(order.items || [])] }
    )

    return res.json({ success: true, cocina_number: last_number })
  } catch (err) {
    console.error('Error cocina number:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH /api/cocina/complete/:orderId
// Marca una orden como completada en el historial
router.patch('/complete/:orderId', async (req, res) => {
  const { orderId } = req.params
  try {
    await sequelize.query(
      'UPDATE cocina_order_numbers SET completed_at = NOW() WHERE order_id = ?',
      { replacements: [orderId] }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/cocina/history — historial completo con productos
router.get('/history', async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT 
         cn.cocina_number,
         cn.order_id,
         cn.table_name,
         cn.items_snapshot,
         cn.completed_at,
         cn.created_at,
         o.status,
         o.opened_at,
         o.total
       FROM cocina_order_numbers cn
       LEFT JOIN orders o ON o.id = cn.order_id
       ORDER BY cn.cocina_number DESC
       LIMIT 200`,
      { type: QueryTypes.SELECT }
    )

    // Parsear items_snapshot si viene como string
    const data = rows.map(r => ({
      ...r,
      items_snapshot: typeof r.items_snapshot === 'string'
        ? JSON.parse(r.items_snapshot)
        : (r.items_snapshot || [])
    }))

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router