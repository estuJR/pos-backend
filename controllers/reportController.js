const { sequelize, Order, OrderItem, Payment, Product, Category, Table } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// Helper: Rango de fechas
const getDateRange = (period) => {
  const now = new Date();
  let start, end;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start); end.setDate(end.getDate() + 1);
      break;
    case 'week':
      start = new Date(now); start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(end.getDate() + 7);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start); end.setDate(end.getDate() + 1);
  }
  return { start, end };
};

// Reporte resumen del día / período
const getSummaryReport = async (req, res) => {
  try {
    const { period = 'today', start_date, end_date } = req.query;
    let start, end;
    if (start_date && end_date) {
      start = new Date(start_date);
      end = new Date(end_date); end.setDate(end.getDate() + 1);
    } else {
      ({ start, end } = getDateRange(period));
    }

    const dateFilter = { [Op.between]: [start, end] };

    // Ventas totales
    const salesData = await Payment.findOne({
      where: { status: 'completed', paid_at: dateFilter },
      attributes: [
        [fn('COUNT', col('id')), 'total_transactions'],
        [fn('SUM', col('amount_paid')), 'total_revenue'],
        [fn('SUM', col('tip_amount')), 'total_tips'],
        [fn('AVG', col('amount_paid')), 'avg_ticket'],
      ],
      raw: true,
    });

    // Órdenes por estado
    const ordersByStatus = await Order.findAll({
      where: { created_at: dateFilter },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    // Ventas por método de pago
    const paymentsByMethod = await Payment.findAll({
      where: { status: 'completed', paid_at: dateFilter },
      attributes: ['method', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount_paid')), 'total']],
      group: ['method'],
      raw: true,
    });

    // Hora pico (cantidad de órdenes por hora)
    const ordersByHour = await Order.findAll({
      where: { created_at: dateFilter, status: { [Op.ne]: 'cancelled' } },
      attributes: [
        [fn('HOUR', col('created_at')), 'hour'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [fn('HOUR', col('created_at'))],
      order: [[fn('HOUR', col('created_at')), 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        sales: salesData,
        orders_by_status: ordersByStatus,
        payments_by_method: paymentsByMethod,
        orders_by_hour: ordersByHour,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Productos más vendidos
const getTopProducts = async (req, res) => {
  try {
    const { period = 'today', limit = 10 } = req.query;
    const { start, end } = getDateRange(period);

    const topProducts = await OrderItem.findAll({
      where: {
        status: { [Op.ne]: 'cancelled' },
        created_at: { [Op.between]: [start, end] },
      },
      attributes: [
        'product_id',
        'product_name',
        [fn('SUM', col('quantity')), 'total_sold'],
        [fn('SUM', col('subtotal')), 'total_revenue'],
        [fn('COUNT', col('order_id')), 'order_count'],
      ],
      group: ['product_id', 'product_name'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: true,
    });

    res.json({ success: true, data: topProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ventas por categoría
const getSalesByCategory = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const { start, end } = getDateRange(period);

    const result = await sequelize.query(`
      SELECT 
        c.id AS category_id,
        c.name AS category_name,
        c.color,
        SUM(oi.quantity) AS total_sold,
        SUM(oi.subtotal) AS total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE oi.status != 'cancelled'
        AND oi.created_at BETWEEN :start AND :end
      GROUP BY c.id, c.name, c.color
      ORDER BY total_revenue DESC
    `, {
      replacements: { start, end },
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ventas diarias (últimos N días)
const getDailySales = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const start = new Date(); start.setDate(start.getDate() - parseInt(days));
    start.setHours(0, 0, 0, 0);

    const result = await sequelize.query(`
      SELECT 
        DATE(paid_at) AS sale_date,
        COUNT(id) AS transactions,
        SUM(amount_paid) AS revenue,
        AVG(amount_paid) AS avg_ticket
      FROM payments
      WHERE status = 'completed' AND paid_at >= :start
      GROUP BY DATE(paid_at)
      ORDER BY sale_date ASC
    `, {
      replacements: { start },
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Rendimiento de mesas
const getTablePerformance = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const { start, end } = getDateRange(period);

    const result = await sequelize.query(`
      SELECT 
        t.id, t.number, t.name, t.section,
        COUNT(o.id) AS total_orders,
        SUM(o.total) AS total_revenue,
        AVG(TIMESTAMPDIFF(MINUTE, o.opened_at, o.closed_at)) AS avg_duration_minutes
      FROM tables t
      LEFT JOIN orders o ON t.id = o.table_id 
        AND o.status = 'paid' 
        AND o.created_at BETWEEN :start AND :end
      WHERE t.is_active = 1
      GROUP BY t.id, t.number, t.name, t.section
      ORDER BY total_revenue DESC
    `, {
      replacements: { start, end },
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSummaryReport, getTopProducts, getSalesByCategory, getDailySales, getTablePerformance };
