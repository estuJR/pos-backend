const { Product, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

const getInventory = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_active: true },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }],
      order: [['category_id', 'ASC'], ['sort_order', 'ASC']],
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, min_stock } = req.body;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    const updates = {};
    if (stock !== undefined) updates.stock = (stock === '' || stock === null) ? null : parseInt(stock);
    if (min_stock !== undefined) updates.min_stock = parseInt(min_stock);
    await product.update(updates);
    res.json({ success: true, data: product, message: `Stock de ${product.name} actualizado` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getLowStock = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_active: true, stock: { [Op.not]: null, [Op.lte]: sequelize.col('min_stock') } },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['stock', 'ASC']],
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getInventory, updateStock, getLowStock };
