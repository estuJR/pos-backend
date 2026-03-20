const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailySummary = sequelize.define('DailySummary', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
    total_revenue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total_transactions: { type: DataTypes.INTEGER, defaultValue: 0 },
    avg_ticket: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cash_total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    card_total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    transfer_total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'daily_summaries',
    timestamps: true,
  });
  return DailySummary;
};
