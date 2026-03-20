const { Payment, Order, sequelize } = require('../models');
const { Op } = require('sequelize');
const DailySummary = require('../models/DailySummary')(sequelize);

const closeDayAndSave = async (req, res) => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');

    const payments = await Payment.findAll({
      where: { paid_at: { [Op.between]: [start, end] }, status: 'completed' }
    });

    const total_revenue = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const total_transactions = payments.length;
    const avg_ticket = total_transactions > 0 ? total_revenue / total_transactions : 0;
    const cash_total = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const card_total = payments.filter(p => p.method === 'card').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const transfer_total = payments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);

    const [summary, created] = await DailySummary.upsert({
      date: dateStr,
      total_revenue,
      total_transactions,
      avg_ticket,
      cash_total,
      card_total,
      transfer_total,
    });

    res.json({ success: true, data: summary, message: created ? 'Día cerrado y guardado' : 'Resumen actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    await DailySummary.sync();
    const summaries = await DailySummary.findAll({
      order: [['date', 'DESC']],
      limit: 30,
    });
    res.json({ success: true, data: summaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { closeDayAndSave, getHistory };
