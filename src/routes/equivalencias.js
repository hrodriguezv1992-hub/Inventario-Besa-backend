const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/equivalencias
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equivalencias ORDER BY nombre_xml');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equivalencias
router.post('/', authMiddleware, async (req, res) => {
  const { nombre_xml, sku } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO equivalencias (nombre_xml, sku) VALUES ($1,$2)
       ON CONFLICT (nombre_xml) DO UPDATE SET sku=EXCLUDED.sku RETURNING *`,
      [nombre_xml, String(sku)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equivalencias/:id  (id numérico o nombre_xml codificado)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // Si es numérico, borrar por id; si no, borrar por nombre_xml
    if (/^\d+$/.test(id)) {
      await pool.query('DELETE FROM equivalencias WHERE id=$1', [Number(id)]);
    } else {
      await pool.query('DELETE FROM equivalencias WHERE nombre_xml=$1', [decodeURIComponent(id)]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equivalencias/batch
router.post('/batch', authMiddleware, async (req, res) => {
  const { equivalencias } = req.body;
  if (!Array.isArray(equivalencias)) return res.status(400).json({ error: 'equivalencias requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM equivalencias');
    for (const e of equivalencias) {
      await client.query(
        'INSERT INTO equivalencias (nombre_xml, sku) VALUES ($1,$2)',
        [e.nombre_xml, String(e.sku)]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: equivalencias.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
