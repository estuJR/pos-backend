const { Category, Product } = require('../models');

// =====================
//    CATEGORÍAS
// =====================

const getCategories = async (req, res) => {
  try {
    const { active_only } = req.query;
    const where = active_only === 'true' ? { is_active: true } : {};

    const categories = await Category.findAll({
      where,
      include: [{ model: Product, as: 'products', where: { is_active: true }, required: false }],
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, color, icon, sort_order } = req.body;
    const category = await Category.create({ name, description, color, icon, sort_order });
    res.status(201).json({ success: true, data: category, message: 'Categoría creada exitosamente' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: 'Categoría no encontrada' });

    await category.update(req.body);
    res.json({ success: true, data: category, message: 'Categoría actualizada' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: 'Categoría no encontrada' });

    await category.update({ is_active: false }); // soft delete
    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
//    PRODUCTOS
// =====================

const getProducts = async (req, res) => {
  try {
    const { category_id, available_only, search } = req.query;
    const where = { is_active: true };
    if (category_id) where.category_id = category_id;
    if (available_only === 'true') where.is_available = true;
    if (search) {
      const { Op } = require('sequelize');
      where.name = { [Op.like]: `%${search}%` };
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }],
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: 'category' }],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, cost, image_url, sku, category_id, preparation_time, sort_order } = req.body;
    const product = await Product.create({ name, description, price, cost, image_url, sku, category_id, preparation_time, sort_order });
    const productWithCategory = await Product.findByPk(product.id, { include: [{ model: Category, as: 'category' }] });
    res.status(201).json({ success: true, data: productWithCategory, message: 'Producto creado exitosamente' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    await product.update(req.body);
    res.json({ success: true, data: product, message: 'Producto actualizado' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleProductAvailability = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    await product.update({ is_available: !product.is_available });
    res.json({
      success: true,
      data: product,
      message: `Producto ${product.is_available ? 'disponible' : 'no disponible'}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    await product.update({ is_active: false }); // soft delete
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, getProductById, createProduct, updateProduct,
  toggleProductAvailability, deleteProduct,
};
