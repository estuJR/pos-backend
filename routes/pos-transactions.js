const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')
const { protect, requireSupervisor } = require('../middleware/auth')

// ═══════════════════════════════════════════════════════════════
//  Devuelve la fecha actual (YYYY-MM-DD) en horario de Guatemala
//  (UTC-6, sin horario de verano), en vez de usar UTC directamente.
// ═══════════════════════════════════════════════════════════════
function todayGT() {
  const now = new Date()
  // Formatea la fecha directamente en la zona horaria de Guatemala
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

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

    const today = todayGT()

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
    const date = req.query.date || todayGT()

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
//  GET /api/pos-transactions/stats-range?from=2026-06-01&to=2026-06-12
//  Estadísticas agregadas por rango de fechas: resumen, productos
//  (cantidad + ventas netas) y categorías (cantidad + ventas netas).
//  Si no se envían parámetros, usa el día de hoy en ambos extremos.
// ═══════════════════════════════════════════════════════════════
router.get('/stats-range', async (req, res) => {
  try {
    const today = todayGT()
    const from = req.query.from || today
    const to = req.query.to || today

    // Resumen y desglose por método de pago
    const [summary] = await sequelize.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) as efectivo,
         COALESCE(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) as tarjeta,
         COALESCE(SUM(CASE WHEN method = 'transferencia' THEN amount ELSE 0 END), 0) as transferencia
       FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?`,
      { replacements: [from, to] }
    )

    // Ventas por día (para la gráfica)
    const [byDay] = await sequelize.query(
      `SELECT 
         transaction_date as date,
         COALESCE(SUM(amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) as efectivo,
         COALESCE(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) as tarjeta,
         COALESCE(SUM(CASE WHEN method = 'transferencia' THEN amount ELSE 0 END), 0) as transferencia
       FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?
       GROUP BY transaction_date
       ORDER BY transaction_date ASC`,
      { replacements: [from, to] }
    )

    // Items de todas las transacciones del rango
    const [transactions] = await sequelize.query(
      `SELECT items, amount FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?`,
      { replacements: [from, to] }
    )

    // Agregar por artículo individual
    const productMap = {}
    // Agregar por categoría
    const categoryMap = {}

    for (const tx of transactions) {
      let items = tx.items
      if (typeof items === 'string') {
        try { items = JSON.parse(items) } catch { continue }
      }
      if (!Array.isArray(items)) continue

      for (const item of items) {
        const name = item.name
        const category = item.category || 'otros'
        const qty = item.quantity || 1
        // El total guardado por transacción es el cobro total (puede incluir varios
        // artículos), así que aquí no tenemos el precio unitario garantizado.
        // Si el item trae 'price' o 'amount' lo usamos; si no, dejamos revenue en 0
        // para esa línea (se puede mejorar si el frontend empieza a mandar precio).
        const lineRevenue = (item.price ? item.price * qty : 0)

        if (!productMap[name]) productMap[name] = { name, category, quantity: 0, revenue: 0 }
        productMap[name].quantity += qty
        productMap[name].revenue += lineRevenue

        if (!categoryMap[category]) categoryMap[category] = { category, quantity: 0, revenue: 0 }
        categoryMap[category].quantity += qty
        categoryMap[category].revenue += lineRevenue
      }
    }

    const products = Object.values(productMap).sort((a, b) => b.quantity - a.quantity)
    const categories = Object.values(categoryMap).sort((a, b) => b.quantity - a.quantity)

    res.json({
      success: true,
      from,
      to,
      summary: summary[0],
      byDay,
      products,
      categories,
    })
  } catch (err) {
    console.error('pos-transactions GET stats-range error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/pos-transactions/expenses
//  Registra un gasto operativo del día (Gastos del día)
// ═══════════════════════════════════════════════════════════════
router.post('/expenses', async (req, res) => {
  try {
    const { description, amount, userName, date } = req.body

    if (!description || !amount) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' })
    }

    const expenseDate = date || todayGT()

    await sequelize.query(
      `INSERT INTO pos_expenses (expense_date, description, amount, user_name)
       VALUES (?, ?, ?, ?)`,
      { replacements: [expenseDate, description, amount, userName || ''] }
    )

    res.json({ success: true, message: 'Gasto guardado' })
  } catch (err) {
    console.error('pos-transactions POST expenses error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/pos-transactions/expenses?date=2026-06-30
//  Lista de gastos de un día específico, con el total
// ═══════════════════════════════════════════════════════════════
router.get('/expenses', async (req, res) => {
  try {
    const date = req.query.date || todayGT()

    const [expenses] = await sequelize.query(
      `SELECT id, expense_date, description, amount, user_name, created_at
       FROM pos_expenses WHERE expense_date = ?
       ORDER BY created_at DESC`,
      { replacements: [date] }
    )

    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    res.json({ success: true, date, data: expenses, total })
  } catch (err) {
    console.error('pos-transactions GET expenses error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/pos-transactions/expenses-range?from=&to=
//  Gastos agregados por rango de fechas (para Excel y reportes)
// ═══════════════════════════════════════════════════════════════
router.get('/expenses-range', async (req, res) => {
  try {
    const today = todayGT()
    const from = req.query.from || today
    const to = req.query.to || today

    const [expenses] = await sequelize.query(
      `SELECT id, expense_date, description, amount, user_name, created_at
       FROM pos_expenses WHERE expense_date BETWEEN ? AND ?
       ORDER BY expense_date ASC, created_at ASC`,
      { replacements: [from, to] }
    )

    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    res.json({ success: true, from, to, data: expenses, total })
  } catch (err) {
    console.error('pos-transactions GET expenses-range error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  DELETE /api/pos-transactions/expenses/:id
//  Elimina un gasto (solo supervisor)
// ═══════════════════════════════════════════════════════════════
router.delete('/expenses/:id', protect, requireSupervisor, async (req, res) => {
  try {
    const { id } = req.params

    await sequelize.query(`DELETE FROM pos_expenses WHERE id = ?`, { replacements: [id] })

    res.json({ success: true, message: 'Gasto eliminado' })
  } catch (err) {
    console.error('pos-transactions DELETE expense error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  POST /api/pos-transactions/cierre
//  Guarda (o actualiza, si ya existe) el cuadre de caja de un día
// ═══════════════════════════════════════════════════════════════
router.post('/cierre', protect, async (req, res) => {
  try {
    const {
      date,
      fondoInicial, cobrosEfectivo, reembolsosEfectivo, gastosDia,
      efectivoTeorico, efectivoReal, descuadre, ventasBrutas, ventasNetas,
      efectivo, tarjeta, transferencia, gananciaNeta, userName,
    } = req.body

    const cierreDate = date || todayGT()

    await sequelize.query(
      `INSERT INTO pos_cierres
        (cierre_date, fondo_inicial, cobros_efectivo, reembolsos_efectivo, gastos_dia,
         efectivo_teorico, efectivo_real, descuadre, ventas_brutas, ventas_netas,
         efectivo, tarjeta, transferencia, ganancia_neta, user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         fondo_inicial = VALUES(fondo_inicial),
         cobros_efectivo = VALUES(cobros_efectivo),
         reembolsos_efectivo = VALUES(reembolsos_efectivo),
         gastos_dia = VALUES(gastos_dia),
         efectivo_teorico = VALUES(efectivo_teorico),
         efectivo_real = VALUES(efectivo_real),
         descuadre = VALUES(descuadre),
         ventas_brutas = VALUES(ventas_brutas),
         ventas_netas = VALUES(ventas_netas),
         efectivo = VALUES(efectivo),
         tarjeta = VALUES(tarjeta),
         transferencia = VALUES(transferencia),
         ganancia_neta = VALUES(ganancia_neta),
         user_name = VALUES(user_name)`,
      {
        replacements: [
          cierreDate,
          fondoInicial || 0, cobrosEfectivo || 0, reembolsosEfectivo || 0, gastosDia || 0,
          efectivoTeorico || 0, efectivoReal || 0, descuadre || 0, ventasBrutas || 0, ventasNetas || 0,
          efectivo || 0, tarjeta || 0, transferencia || 0, gananciaNeta || 0, userName || '',
        ],
      }
    )

    res.json({ success: true, message: 'Cierre guardado' })
  } catch (err) {
    console.error('pos-transactions POST cierre error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
//  GET /api/pos-transactions/cierre?date=2026-06-30
//  Obtiene el cuadre de caja guardado de un día (si existe)
// ═══════════════════════════════════════════════════════════════
router.get('/cierre', async (req, res) => {
  try {
    const date = req.query.date || todayGT()

    const [rows] = await sequelize.query(
      `SELECT * FROM pos_cierres WHERE cierre_date = ? LIMIT 1`,
      { replacements: [date] }
    )

    res.json({ success: true, date, data: rows[0] || null })
  } catch (err) {
    console.error('pos-transactions GET cierre error:', err)
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
    const date = req.query.date || todayGT()

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