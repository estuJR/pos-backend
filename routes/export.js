const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')

// GET /api/export/excel?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/excel', async (req, res) => {
  try {
    const ExcelJS = require('exceljs')

    function todayGT() {
      const now = new Date()
      const gt = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      return gt.toISOString().slice(0, 10)
    }

    const from = req.query.from || todayGT()
    const to   = req.query.to   || todayGT()

    // 1. Resumen
    const [summaryRows] = await sequelize.query(
      `SELECT
         COUNT(*) as total_transactions,
         COALESCE(SUM(amount),0) as total_revenue,
         COALESCE(SUM(CASE WHEN method='efectivo'      THEN amount ELSE 0 END),0) as efectivo,
         COALESCE(SUM(CASE WHEN method='tarjeta'       THEN amount ELSE 0 END),0) as tarjeta,
         COALESCE(SUM(CASE WHEN method='transferencia' THEN amount ELSE 0 END),0) as transferencia
       FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?`,
      { replacements: [from, to] }
    )
    const sum = summaryRows[0]

    // 2. Por día
    const [byDay] = await sequelize.query(
      `SELECT
         transaction_date as date,
         COUNT(*) as total_transactions,
         COALESCE(SUM(amount),0) as total_revenue,
         COALESCE(SUM(CASE WHEN method='efectivo'      THEN amount ELSE 0 END),0) as efectivo,
         COALESCE(SUM(CASE WHEN method='tarjeta'       THEN amount ELSE 0 END),0) as tarjeta,
         COALESCE(SUM(CASE WHEN method='transferencia' THEN amount ELSE 0 END),0) as transferencia
       FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?
       GROUP BY transaction_date ORDER BY transaction_date ASC`,
      { replacements: [from, to] }
    )

    // 3. Productos y categorías
    const [transactions] = await sequelize.query(
      `SELECT items FROM pos_transactions WHERE transaction_date BETWEEN ? AND ?`,
      { replacements: [from, to] }
    )
    const productMap = {}
    const categoryMap = {}
    for (const tx of transactions) {
      let items = tx.items
      if (typeof items === 'string') { try { items = JSON.parse(items) } catch { continue } }
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const name = item.name || 'Sin nombre'
        const cat  = item.category || 'otros'
        const qty  = Number(item.quantity || 1)
        const rev  = Number(item.price || 0) * qty
        if (!productMap[name]) productMap[name] = { name, category: cat, quantity: 0, revenue: 0 }
        productMap[name].quantity += qty
        productMap[name].revenue  += rev
        if (!categoryMap[cat]) categoryMap[cat] = { category: cat, quantity: 0, revenue: 0 }
        categoryMap[cat].quantity += qty
        categoryMap[cat].revenue  += rev
      }
    }
    const products   = Object.values(productMap).sort((a, b) => b.quantity - a.quantity)
    const categories = Object.values(categoryMap).sort((a, b) => b.quantity - a.quantity)

    // 4. Gastos
    const [gastos] = await sequelize.query(
      `SELECT expense_date, description, amount, user_name
       FROM pos_expenses WHERE expense_date BETWEEN ? AND ?
       ORDER BY expense_date ASC`,
      { replacements: [from, to] }
    )
    const totalGastos  = gastos.reduce((s, g) => s + Number(g.amount || 0), 0)
    const totalVentas  = Number(sum.total_revenue || 0)
    const gananciaNeta = totalVentas - totalGastos

    // ── Estilos ──────────────────────────────────────────────────
    const BROWN_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3D2914' } }
    const BROWN_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' }
    const GOLD_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5C861' } }
    const GOLD_FONT  = { bold: true, color: { argb: 'FF3D2914' }, size: 11, name: 'Arial' }
    const BASE_FONT  = { name: 'Arial', size: 11 }
    const TITLE_FONT = { bold: true, size: 13, color: { argb: 'FF3D2914' }, name: 'Arial' }
    const NUM_FMT    = '"Q"#,##0.00'

    function hdr(ws, cols) {
      const row = ws.addRow(cols)
      row.height = 18
      row.eachCell(c => {
        c.fill = BROWN_FILL; c.font = BROWN_FONT
        c.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      return row
    }
    function tot(ws, vals) {
      const row = ws.addRow(vals)
      row.eachCell(c => { c.fill = GOLD_FILL; c.font = GOLD_FONT })
      return row
    }
    function data(ws, vals) {
      const row = ws.addRow(vals)
      row.eachCell(c => { c.font = BASE_FONT })
      return row
    }

    // 5. Inventario
    const [inventoryRows] = await sequelize.query(
      `SELECT name, category, quantity, unit, min_stock, cost_per_unit, updated_at
       FROM inventory_items WHERE is_active = 1 ORDER BY category ASC, name ASC`
    )

    // ── Workbook ─────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook()
    wb.creator = 'El Jardín de los Conejos'
    wb.created = new Date()

    // ── Hoja 1: Resumen ──────────────────────────────────────────
    const ws1 = wb.addWorksheet('Resumen')
    ws1.columns = [{ width: 30 }, { width: 20 }]
    const t1 = ws1.addRow(['EL JARDÍN DE LOS CONEJOS — Reporte de Ventas'])
    t1.getCell(1).font = TITLE_FONT; t1.height = 22
    const p1 = ws1.addRow([`Período: ${from}  al  ${to}`])
    p1.getCell(1).font = { italic: true, color: { argb: 'FF7A6852' }, name: 'Arial' }
    ws1.addRow([])
    hdr(ws1, ['CONCEPTO', 'VALOR'])
    const resumen = [
      ['Total transacciones', Number(sum.total_transactions || 0)],
      ['Total ventas (Q)',    totalVentas],
      ['Efectivo (Q)',        Number(sum.efectivo || 0)],
      ['Tarjeta (Q)',         Number(sum.tarjeta  || 0)],
      ['Transferencia (Q)',   Number(sum.transferencia || 0)],
      ['Total gastos (Q)',    totalGastos],
      ['Ganancia neta (Q)',   gananciaNeta],
    ]
    resumen.forEach(([label, val]) => {
      const row = ws1.addRow([label, val])
      row.getCell(1).font = BASE_FONT
      row.getCell(2).numFmt = NUM_FMT
      if (label === 'Ganancia neta (Q)') {
        row.getCell(2).font = { bold: true, name: 'Arial',
          color: { argb: gananciaNeta >= 0 ? 'FF558B2F' : 'FFC45A1F' } }
      } else {
        row.getCell(2).font = BASE_FONT
      }
    })

    // ── Hoja 2: Por Día ──────────────────────────────────────────
    const ws2 = wb.addWorksheet('Por Día')
    ws2.columns = [
      { width: 14 }, { width: 16 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 18 }
    ]
    hdr(ws2, ['FECHA', 'TRANSACCIONES', 'TOTAL (Q)', 'EFECTIVO (Q)', 'TARJETA (Q)', 'TRANSFERENCIA (Q)'])
    let totTx=0, totRev=0, totEf=0, totTarj=0, totTrans=0
    byDay.forEach(d => {
      const tx=Number(d.total_transactions||0), rv=Number(d.total_revenue||0)
      const ef=Number(d.efectivo||0), tj=Number(d.tarjeta||0), tr=Number(d.transferencia||0)
      totTx+=tx; totRev+=rv; totEf+=ef; totTarj+=tj; totTrans+=tr
      const row = data(ws2, [d.date, tx, rv, ef, tj, tr])
      ;[3,4,5,6].forEach(i => row.getCell(i).numFmt = NUM_FMT)
    })
    ws2.addRow([])
    const tr2 = tot(ws2, ['TOTAL', totTx, totRev, totEf, totTarj, totTrans])
    ;[3,4,5,6].forEach(i => tr2.getCell(i).numFmt = NUM_FMT)

    // ── Hoja 3: Productos ────────────────────────────────────────
    const ws3 = wb.addWorksheet('Productos')
    ws3.columns = [{ width: 5 }, { width: 30 }, { width: 14 }, { width: 20 }, { width: 16 }]
    hdr(ws3, ['#', 'PRODUCTO', 'CATEGORÍA', 'UNIDADES VENDIDAS', 'INGRESOS (Q)'])
    let totU=0, totR=0
    products.forEach((p, i) => {
      const row = data(ws3, [i+1, p.name, p.category, p.quantity, p.revenue])
      row.getCell(5).numFmt = NUM_FMT
      totU += p.quantity; totR += p.revenue
    })
    ws3.addRow([])
    const tr3 = tot(ws3, ['', 'TOTAL', '', totU, totR])
    tr3.getCell(5).numFmt = NUM_FMT

    // ── Hoja 4: Categorías ───────────────────────────────────────
    const ws4 = wb.addWorksheet('Categorías')
    ws4.columns = [{ width: 18 }, { width: 20 }, { width: 16 }]
    hdr(ws4, ['CATEGORÍA', 'UNIDADES VENDIDAS', 'INGRESOS (Q)'])
    categories.forEach(c => {
      const row = data(ws4, [c.category, c.quantity, c.revenue])
      row.getCell(3).numFmt = NUM_FMT
    })

    // ── Hoja 5: Gastos ───────────────────────────────────────────
    const ws5 = wb.addWorksheet('Gastos')
    ws5.columns = [{ width: 14 }, { width: 32 }, { width: 14 }, { width: 20 }]
    hdr(ws5, ['FECHA', 'DESCRIPCIÓN', 'MONTO (Q)', 'REGISTRADO POR'])
    gastos.forEach(g => {
      const row = data(ws5, [g.expense_date, g.description, Number(g.amount||0), g.user_name||''])
      row.getCell(3).numFmt = NUM_FMT
    })
    ws5.addRow([])
    const tr5 = tot(ws5, ['', 'TOTAL', totalGastos, ''])
    tr5.getCell(3).numFmt = NUM_FMT

    // ── Hoja 6: Inventario ──────────────────────────────────────
    const ws6 = wb.addWorksheet('Inventario')
    ws6.columns = [
      { width: 28 }, { width: 16 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 14 }, { width: 18 }
    ]
    hdr(ws6, ['PRODUCTO', 'CATEGORÍA', 'EXISTENCIA', 'UNIDAD', 'STOCK MÍNIMO', 'COSTO/UNIDAD (Q)', 'ÚLTIMA ACTUALIZACIÓN'])
    let totalValorInv = 0
    inventoryRows.forEach(item => {
      const qty   = Number(item.quantity   || 0)
      const cost  = Number(item.cost_per_unit || 0)
      const valor = qty * cost
      totalValorInv += valor
      const alerta = qty <= Number(item.min_stock || 0) ? '⚠️ ' : ''
      const updated = item.updated_at ? String(item.updated_at).slice(0, 10) : ''
      const row = data(ws6, [
        alerta + item.name,
        item.category || 'general',
        qty,
        item.unit || 'unidades',
        Number(item.min_stock || 0),
        cost,
        updated
      ])
      row.getCell(6).numFmt = NUM_FMT
      // Resaltar en rojo si stock bajo
      if (qty <= Number(item.min_stock || 0)) {
        row.getCell(1).font = { ...BASE_FONT, color: { argb: 'FFC45A1F' }, bold: true }
      }
    })
    ws6.addRow([])
    const tr6 = tot(ws6, ['TOTAL ÍTEMS: ' + inventoryRows.length, '', '', '', '', totalValorInv, ''])
    tr6.getCell(6).numFmt = NUM_FMT

    // ── Enviar ───────────────────────────────────────────────────
    const fileName = `reporte-jardindelosconejos-${from}-${to}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    await wb.xlsx.write(res)
    res.end()

  } catch (err) {
    console.error('export/excel error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router