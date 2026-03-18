const { Order, OrderItem, Product, Table, sequelize } = require('../models');

// =====================
//    MESAS
// =====================

const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({
      where: { is_active: true },
      include: [{
        model: Order,
        as: 'orders',
        where: { status: ['open', 'in_progress', 'ready', 'delivered'] },
        required: false,
        limit: 1,
        order: [['created_at', 'DESC']],
      }],
      order: [['number', 'ASC']],
    });
    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createTable = async (req, res) => {
  try {
    const { number, name, capacity, section } = req.body;
    const table = await Table.create({ number, name, capacity, section });
    res.status(201).json({ success: true, data: table, message: 'Mesa creada exitosamente' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const table = await Table.findByPk(id);
    if (!table) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    await table.update({ status });
    res.json({ success: true, data: table, message: 'Estado de mesa actualizado' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// =====================
//    ÓRDENES
// =====================

const getOrders = async (req, res) => {
  try {
    const { status, date, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (date) {
      const { Op } = require('sequelize');
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.created_at = { [Op.between]: [startDate, endDate] };
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: Table, as: 'table', attributes: ['id', 'number', 'name'] },
        {
          model: OrderItem, as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image_url'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Table, as: 'table' },
        {
          model: OrderItem, as: 'items',
          include: [{ model: Product, as: 'product' }],
        },
      ],
    });
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { table_id, customer_name, customer_count, type, notes, items } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'La orden debe tener al menos un producto' });
    }

    // Calcular totales
    let subtotal = 0;
    const taxRate = parseFloat(process.env.RESTAURANT_TAX || 0.12);
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });
      if (!product || !product.is_available) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Producto ${item.product_id} no disponible` });
      }
      const itemSubtotal = parseFloat(product.price) * item.quantity;
      subtotal += itemSubtotal;
      orderItemsData.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
      });
    }

    const tax_amount = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax_amount).toFixed(2));

    // Generar numero de orden
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await Order.count();
    const order_number = 'ORD-' + dateStr + '-' + String(orderCount + 1).padStart(4, '0');

    const order = await Order.create({
      order_number,
      table_id: table_id || null,
      customer_name,
      customer_count: customer_count || 1,
      type: type || 'dine_in',
      notes,
      subtotal,
      tax_amount,
      total,
      status: 'open',
    }, { transaction: t });

    // Crear items
    const itemsWithOrderId = orderItemsData.map(item => ({ ...item, order_id: order.id }));
    await OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

    // Actualizar estado de la mesa
    if (table_id) {
      await Table.update({ status: 'occupied' }, { where: { id: table_id }, transaction: t });
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: Table, as: 'table' },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      ],
    });

    res.status(201).json({ success: true, data: fullOrder, message: 'Orden creada exitosamente' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

const addItemToOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: order_id } = req.params;
    const { product_id, quantity, notes } = req.body;

    const order = await Order.findByPk(order_id, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Orden no encontrada' }); }
    if (['paid', 'cancelled'].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No se puede modificar una orden cerrada' });
    }

    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product || !product.is_available) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Producto no disponible' });
    }

    const itemSubtotal = parseFloat(product.price) * quantity;
    const newItem = await OrderItem.create({
      order_id,
      product_id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
      subtotal: itemSubtotal,
      notes: notes || null,
    }, { transaction: t });

    // Recalcular totales de la orden
    await recalculateOrderTotals(order_id, t);
    await t.commit();

    res.status(201).json({ success: true, data: newItem, message: 'Producto agregado a la orden' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderItemStatus = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { status } = req.body;
    const item = await OrderItem.findByPk(item_id);
    if (!item) return res.status(404).json({ success: false, message: 'Item no encontrado' });
    await item.update({ status });
    res.json({ success: true, data: item, message: 'Estado actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByPk(id, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ success: false, message: 'Orden no encontrada' }); }

    const updates = { status };
    if (status === 'paid' || status === 'cancelled') {
      updates.closed_at = new Date();
      // Liberar la mesa
      if (order.table_id) {
        await Table.update({ status: 'available' }, { where: { id: order.table_id }, transaction: t });
      }
    }

    await order.update(updates, { transaction: t });
    await t.commit();
    res.json({ success: true, data: order, message: `Orden ${status}` });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

const removeItemFromOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: order_id, item_id } = req.params;
    const item = await OrderItem.findOne({ where: { id: item_id, order_id }, transaction: t });
    if (!item) { await t.rollback(); return res.status(404).json({ success: false, message: 'Item no encontrado' }); }

    await item.update({ status: 'cancelled' }, { transaction: t });
    await recalculateOrderTotals(order_id, t);
    await t.commit();
    res.json({ success: true, message: 'Item removido de la orden' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Recalcular totales de una orden
const recalculateOrderTotals = async (order_id, t) => {
  const taxRate = parseFloat(process.env.RESTAURANT_TAX || 0.12);
  const items = await OrderItem.findAll({
    where: { order_id, status: { [require('sequelize').Op.ne]: 'cancelled' } },
    transaction: t,
  });
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const tax_amount = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + tax_amount).toFixed(2));
  await Order.update({ subtotal, tax_amount, total }, { where: { id: order_id }, transaction: t });
};

module.exports = {
  getTables, createTable, updateTableStatus,
  getOrders, getOrderById, createOrder,
  addItemToOrder, updateOrderItemStatus, updateOrderStatus, removeItemFromOrder,
};