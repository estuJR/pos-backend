const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('supervisor', 'empleado'),
    allowNull: false,
    defaultValue: 'empleado',
  },
  pin_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  two_factor_confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'users',
});

// Método para verificar PIN
User.prototype.verifyPin = async function(pin) {
  return bcrypt.compare(String(pin), this.pin_hash);
};

// Hook: hashear PIN antes de crear
User.beforeCreate(async (user) => {
  user.pin_hash = await bcrypt.hash(String(user.pin_hash), 10);
});

User.beforeUpdate(async (user) => {
  if (user.changed('pin_hash')) {
    user.pin_hash = await bcrypt.hash(String(user.pin_hash), 10);
  }
});

module.exports = User;