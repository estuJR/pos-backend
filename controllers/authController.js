const jwt = require('jsonwebtoken');
const { User } = require('../models');

// POST /api/auth/login
// Body: { role: "supervisor"|"empleado", pin: "1234" }
const login = async (req, res) => {
  try {
    const { role, pin } = req.body;

    if (!role || !pin) {
      return res.status(400).json({ success: false, message: 'Role y PIN son requeridos' });
    }

    // Buscar usuarios activos con ese rol
    const users = await User.findAll({
      where: { role, is_active: true },
    });

    if (!users.length) {
      return res.status(401).json({ success: false, message: 'PIN incorrecto' });
    }

    // Verificar PIN contra cada usuario del rol
    let authenticatedUser = null;
    for (const user of users) {
      const valid = await user.verifyPin(pin);
      if (valid) {
        authenticatedUser = user;
        break;
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({ success: false, message: 'PIN incorrecto' });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me — validar token actual
const me = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// GET /api/auth/users — listar usuarios para la pantalla de login
// (sin datos sensibles, solo nombre y rol)
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'role'],
      order: [['role', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, me, getUsers };
