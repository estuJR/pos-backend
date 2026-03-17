const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ID string del frontend: "gringa", "gaseosas", etc.
  id_key: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  sku: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  preparation_time: {
    type: DataTypes.INTEGER, // minutos
    defaultValue: 0,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'products',
});

module.exports = Product;
