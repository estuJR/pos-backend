const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  table_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  customer_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  type: {
    type: DataTypes.ENUM('dine_in', 'takeout', 'delivery'),
    defaultValue: 'dine_in',
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'ready', 'delivered', 'paid', 'cancelled'),
    defaultValue: 'open',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  opened_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  hooks: {
    beforeCreate: async (order) => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM orders');
      const count = parseInt(results[0].count) + 1;
      order.order_number = `ORD-${dateStr}-${String(count).padStart(4, '0')}`;
    },
  },
});

module.exports = Order;