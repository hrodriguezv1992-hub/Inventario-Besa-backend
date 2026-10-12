const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/log?limit=100&modulo=ventas
router.get('/', authMiddleware, async (req, res) => {
  const { limit = 200, modulo } = req.query;
  try {
    let q = 'SELECT * FROM log_acciones WHERE 1=1';
    const params = [];
    if (modulo) { params.push(modulo); q += ` AND modulo=$${params.length}`; }
    params.push(parseInt(limit));
    q += ` ORDER BY fecha DESC LIMIT $${params.length}`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/log
router.post('/', authMiddleware, async (req, res) => {
  const { accion, detalle, modulo } = req.body;
  try {
    await pool.query(
      'INSERT INTO log_acciones (usuario, accion, detalle, modulo) VALUES ($1,$2,$3,$4)',
      [req.user.usuario, accion, detalle, modulo]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
