const { Payment, Order, OrderItem, Table, sequelize } = require('../models');

const processPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { order_id, method, amount_paid, tip_amount, cash_amount, card_amount, transfer_amount, reference, notes } = req.body;

    const order = await Order.findByPk(order_id, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Orden no encontrada' }); }
    if (order.status === 'paid') { await t.rollback(); return res.status(400).json({ success: false, message: 'La orden ya fue pagada' }); }
    if (order.status === 'cancelled') { await t.rollback(); return res.status(400).json({ success: false, message: 'La orden fue cancelada' }); }

    const total = parseFloat(order.total);
    const paid = parseFloat(amount_paid);
    if (paid < total) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Monto insuficiente. Total: ${total}, Pagado: ${paid}`,
      });
    }

    const change = parseFloat((paid - total).toFixed(2));

    // Generar numero de pago
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const paymentCount = await Payment.count();
    const payment_number = 'PAY-' + dateStr + '-' + String(paymentCount + 1).padStart(4, '0');

    const payment = await Payment.create({
      payment_number,
      order_id,
      method,
      amount_paid: paid,
      change_given: change,
      tip_amount: parseFloat(tip_amount || 0),
      cash_amount: parseFloat(cash_amount || 0),
      card_amount: parseFloat(card_amount || 0),
      transfer_amount: parseFloat(transfer_amount || 0),
      reference: reference || null,
      notes: notes || null,
      status: 'completed',
      paid_at: new Date(),
    }, { transaction: t });

    // Marcar orden como pagada
    await order.update({ status: 'paid', closed_at: new Date() }, { transaction: t });

    // Liberar la mesa
    if (order.table_id) {
      await Table.update({ status: 'available' }, { where: { id: order.table_id }, transaction: t });
    }

    await t.commit();

    const fullPayment = await Payment.findByPk(payment.id, {
      include: [{ model: Order, as: 'order' }],
    });

    res.status(201).json({
      success: true,
      data: fullPayment,
      message: 'Pago procesado exitosamente',
      change: change,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const { date, method, status } = req.query;
    const where = {};
    if (method) where.method = method;
    if (status) where.status = status;
    if (date) {
      const { Op } = require('sequelize');
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.paid_at = { [Op.between]: [start, end] };
    }

    const payments = await Payment.findAll({
      where,
      include: [{
        model: Order, as: 'order',
        attributes: ['id', 'order_number', 'table_id', 'customer_name', 'total'],
      }],
      order: [['paid_at', 'DESC']],
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [{
        model: Order, as: 'order',
        include: [{ model: OrderItem, as: 'items' }],
      }],
    });
    if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refundPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) { await t.rollback(); return res.status(404).json({ success: false, message: 'Pago no encontrado' }); }
    if (payment.status !== 'completed') { await t.rollback(); return res.status(400).json({ success: false, message: 'Solo se pueden reembolsar pagos completados' }); }

    await payment.update({ status: 'refunded', notes: notes || payment.notes }, { transaction: t });
    await Order.update({ status: 'open' }, { where: { id: payment.order_id }, transaction: t });
    await t.commit();
    res.json({ success: true, data: payment, message: 'Reembolso procesado' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { processPayment, getPayments, getPaymentById, refundPayment };