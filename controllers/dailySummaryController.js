const { Payment, Order } = require('../models');
const { Op, Sequelize } = require('sequelize');

const closeDayAndSave = async (req, res) => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const payments = await Payment.findAll({
      where: {
        paid_at: { [Op.between]: [start, end] },
        status: 'completed'
      }
    });

    const total_revenue = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const total_transactions = payments.length;
    const avg_ticket = total_transactions > 0 ? total_revenue / total_transactions : 0;
    const cash_total = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const card_total = payments.filter(p => p.method === 'card').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const transfer_total = payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

    res.json({
      success: true,
      data: {
        date: dateStr,
        total_revenue,
        total_transactions,
        avg_ticket: parseFloat(avg_ticket.toFixed(2)),
        cash_total,
        card_total,
        transfer_total
      },
      message: 'Resumen del día guardado'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { status: 'completed' },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('paid_at')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('amount_paid')), 'total_revenue'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_transactions'],
        [Sequelize.fn('AVG', Sequelize.col('amount_paid')), 'avg_ticket'],
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('paid_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('paid_at')), 'DESC']],
      limit: 30
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { closeDayAndSave, getHistory };
