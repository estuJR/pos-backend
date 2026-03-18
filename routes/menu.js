const express = require('express');
const router = express.Router();
const {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, getProductById, createProduct, updateProduct,
  toggleProductAvailability, deleteProduct,
} = require('../controllers/menuController');

// ---- Categorías ----
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ---- Productos ----
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id/availability', toggleProductAvailability);
router.delete('/products/:id', deleteProduct);

module.exports = router;
