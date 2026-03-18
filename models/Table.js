const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(50), // ej: "Mesa 1", "Barra", "Terraza 2"
    allowNull: true,
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'),
    defaultValue: 'available',
  },
  section: {
    type: DataTypes.STRING(50), // ej: "Interior", "Exterior", "Barra"
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tables',
});

module.exports = Table;
