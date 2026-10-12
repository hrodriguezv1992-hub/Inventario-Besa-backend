const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/sync — cargar todos los datos compartidos de la empresa
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT clave, valor FROM shared_data ORDER BY actualizado_en DESC'
    );
    const data = {};
    result.rows.forEach(row => {
      try { data[row.clave] = JSON.parse(row.valor); } catch(e) { data[row.clave] = row.valor; }
    });
    res.json(data);
  } catch(err) {
    console.error('Error GET /api/sync:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sync/:key — guardar un dato compartido
router.put('/:key', authMiddleware, async (req, res) => {
  try {
    const key = req.params.key;
    const value = JSON.stringify(req.body.value);

    await pool.query(`
      INSERT INTO shared_data (clave, valor, actualizado_en)
      VALUES ($1, $2, NOW())
      ON CONFLICT (clave)
      DO UPDATE SET valor = $2, actualizado_en = NOW()
    `, [key, value]);

    res.json({ ok: true });
  } catch(err) {
    console.error('Error PUT /api/sync:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
