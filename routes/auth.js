const express = require('express');
const router = express.Router();
const { login, me, getUsers } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/users', getUsers);      // Para poblar la pantalla de login
router.get('/me', protect, me);      // Verificar token activo

module.exports = router;
