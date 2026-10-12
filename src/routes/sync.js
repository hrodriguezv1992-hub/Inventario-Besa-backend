const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/sync — cargar todos los datos del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT clave, valor FROM user_data WHERE usuario_id = $1',
      [userId]
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

// PUT /api/sync/:key — guardar un dato del usuario
router.put('/:key', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const key = req.params.key;
    const value = JSON.stringify(req.body.value);

    // Upsert: insertar o actualizar
    await pool.query(`
      INSERT INTO user_data (usuario_id, clave, valor, actualizado_en)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (usuario_id, clave)
      DO UPDATE SET valor = $3, actualizado_en = NOW()
    `, [userId, key, value]);

    res.json({ ok: true });
  } catch(err) {
    console.error('Error PUT /api/sync:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
