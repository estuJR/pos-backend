const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')
const { protect, requireSupervisor } = require('../middleware/auth')

// ═══════════════════════════════════════════════════════════════
//  POST /api/pos-transactions
//  Guarda un pago del POS frontend
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const { tableNumber, person, method, amount, items, userName } = req.body

    if (!tableNumber || !method || !amount || !items) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' })
    }

    const today = new Date().toISOString().slice(0, 10)

    await sequelize.query(
      `INSERT INTO pos_transactions (transaction_date, table_number, person, method, amount, items, user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [today, tableNumber, person || 0, method, amount, JSON.stringify(items), userName || ''] }
    )

    res.json({ success: true, message: 'Transacción guardada' })
  } catch (err) {
    console.error('pos-transactions POST error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/pos-transactions/stats?date=2026-06-09
//  Estadísticas del día para el supervisor
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    // Total y conteo
    const [summary] = await sequelize.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) as efectivo,
         COALESCE(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) as tarjeta,
         COALESCE(SUM(CASE WHEN method = 'transferencia' THEN amount ELSE 0 END), 0) as transferencia
       FROM pos_transactions WHERE transaction_date = ?`,
      { replacements: [date] }
    )

    // Productos vendidos
    const [transactions] = await sequelize.query(
      `SELECT items FROM pos_transactions WHERE transaction_date = ?`,
      { replacements: [date] }
    )

    // Agregar productos
    const productMap = {}
    for (const tx of transactions) {
      let items = tx.items
      if (typeof items === 'string') {
        try { items = JSON.parse(items) } catch { continue }
      }
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const key = item.name
        if (!productMap[key]) productMap[key] = { name: key, quantity: 0, category: item.category || 'otros' }
        productMap[key].quantity += item.quantity || 1
      }
    }

    const products = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)

    res.json({
      success: true,
      date,
      summary: summary[0],
      products,
    })
  } catch (err) {
    console.error('pos-transactions GET stats error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/pos-transactions/days
//  Lista de días con ventas (últimos 60 días)
// ═══════════════════════════════════════════════════════════════
router.get('/days', async (req, res) => {
  try {
    const [days] = await sequelize.query(
      `SELECT 
         transaction_date as date,
         COUNT(*) as total_transactions,
         SUM(amount) as total_revenue,
         SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END) as efectivo,
         SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END) as tarjeta,
         SUM(CASE WHEN method = 'transferencia' THEN amount ELSE 0 END) as transferencia
       FROM pos_transactions
       WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
       GROUP BY transaction_date
       ORDER BY transaction_date DESC`,
      {}
    )
    res.json({ success: true, data: days })
  } catch (err) {
    console.error('pos-transactions GET days error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/pos-transactions?date=2026-06-09
//  Borra transacciones de un día (solo supervisor)
// ═══════════════════════════════════════════════════════════════
router.delete('/', protect, requireSupervisor, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    const [result] = await sequelize.query(
      `DELETE FROM pos_transactions WHERE transaction_date = ?`,
      { replacements: [date] }
    )

    res.json({
      success: true,
      message: `Transacciones del ${date} eliminadas`,
      deleted: result.affectedRows
    })
  } catch (err) {
    console.error('pos-transactions DELETE error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router