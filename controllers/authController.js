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

    // ── 2FA: Solo supervisores con 2FA activado ──────────────────
    if (authenticatedUser.role === 'supervisor' && authenticatedUser.two_factor_enabled) {
      // Generar token temporal (5 minutos) para completar el 2FA
      const tempToken = jwt.sign(
        { id: authenticatedUser.id, pending2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        success: true,
        requires2FA: true,
        tempToken,
      });
    }
    // ─────────────────────────────────────────────────────────────

    // Sin 2FA → generar JWT normal
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