const express = require('express');
const router = express.Router();
const { Table } = require('../models');

// GET todas las mesas
router.get('/', async (req, res) => {
  try {
    const tables = await Table.findAll({ order: [['number', 'ASC']] });
    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH actualizar estado de mesa
router.patch('/:id', async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    await table.update(req.body);
    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;