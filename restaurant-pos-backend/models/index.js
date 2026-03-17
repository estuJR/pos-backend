const { sequelize } = require('../config/database');
const Category = require('./Category');
const Product = require('./Product');
const Table = require('./Table');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const User = require('./User');

// ========================
//    ASOCIACIONES
// ========================

// Categoría tiene muchos Productos
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Mesa tiene muchas Órdenes
Table.hasMany(Order, { foreignKey: 'table_id', as: 'orders' });
Order.belongsTo(Table, { foreignKey: 'table_id', as: 'table' });

// Orden tiene muchos Items
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Producto aparece en muchos OrderItems
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Orden tiene un Pago
Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

module.exports = {
  sequelize,
  Category,
  Product,
  Table,
  Order,
  OrderItem,
  Payment,
  User,
};
