const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/conteos/:fecha
router.get('/:fecha', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM conteos WHERE fecha=$1', [fecha]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conteos/batch - guardar conteos (piso)
router.post('/batch', authMiddleware, async (req, res) => {
  const { fecha, conteos } = req.body;
  if (!fecha || !Array.isArray(conteos)) {
    return res.status(400).json({ error: 'fecha y conteos requeridos' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of conteos) {
      await client.query(
        `INSERT INTO conteos (fecha, sku, cantidad, usuario_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (fecha, sku) DO UPDATE SET cantidad=EXCLUDED.cantidad, usuario_id=EXCLUDED.usuario_id`,
        [fecha, String(c.sku), c.cantidad, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: conteos.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/conteos/:fecha/confirmar
router.post('/:fecha/confirmar', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  try {
    await pool.query(
      `UPDATE conteos SET confirmado=true, fecha_confirmacion=NOW()
       WHERE fecha=$1`, [fecha]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/conteos/:fecha/:sku - editar un conteo individual
router.put('/:fecha/:sku', authMiddleware, async (req, res) => {
  const { fecha, sku } = req.params;
  const { cantidad } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO conteos (fecha, sku, cantidad, usuario_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (fecha, sku) DO UPDATE SET cantidad=EXCLUDED.cantidad, usuario_id=EXCLUDED.usuario_id
       RETURNING *`,
      [fecha, String(sku), cantidad, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
