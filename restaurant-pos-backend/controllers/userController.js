const bcrypt = require('bcryptjs');
const { User } = require('../models');

// GET /api/users — listar todos los usuarios
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'role', 'created_at'],
      order: [['role', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users — crear usuario (supervisor asigna PIN, empleado pone nombre)
const createUser = async (req, res) => {
  try {
    const { name, role, pin } = req.body;

    if (!name || !role || !pin) {
      return res.status(400).json({ success: false, message: 'Nombre, rol y PIN son requeridos' });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'El PIN debe ser de 4 dígitos' });
    }

    const user = await User.create({ name, role, pin_hash: pin });

    res.status(201).json({
      success: true,
      data: { id: user.id, name: user.name, role: user.role },
      message: `Usuario ${name} creado exitosamente`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/users/:id — actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const updates = {};
    if (name) updates.name = name;
    if (pin) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ success: false, message: 'El PIN debe ser de 4 dígitos' });
      }
      updates.pin_hash = await bcrypt.hash(pin, 10);
    }

    await user.update(updates);
    res.json({ success: true, data: { id: user.id, name: user.name, role: user.role }, message: 'Usuario actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/users/:id — eliminar usuario (soft delete)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    if (user.role === 'supervisor') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar un supervisor' });
    }
    await user.update({ is_active: false });
    res.json({ success: true, message: `Usuario ${user.name} eliminado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };