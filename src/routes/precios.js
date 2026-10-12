const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/precios/compra
router.get('/compra', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (sku) sku, costo, fecha_vigencia
       FROM lista_precios_compra WHERE activo=true
       ORDER BY sku, fecha_vigencia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/precios/compra/batch
router.post('/compra/batch', authMiddleware, async (req, res) => {
  const { precios, fecha_vigencia } = req.body;
  if (!Array.isArray(precios)) return res.status(400).json({ error: 'precios requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Desactivar precios anteriores
    await client.query('UPDATE lista_precios_compra SET activo=false');
    for (const p of precios) {
      await client.query(
        `INSERT INTO lista_precios_compra (sku, costo, fecha_vigencia)
         VALUES ($1,$2,$3)`,
        [String(p.sku), p.costo, fecha_vigencia || new Date().toISOString().split('T')[0]]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: precios.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/precios/compra/:sku
router.put('/compra/:sku', authMiddleware, async (req, res) => {
  const { sku } = req.params;
  const { costo, fecha_vigencia } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE lista_precios_compra SET activo=false WHERE sku=$1', [sku]);
    const result = await client.query(
      `INSERT INTO lista_precios_compra (sku, costo, fecha_vigencia)
       VALUES ($1,$2,$3) RETURNING *`,
      [sku, costo, fecha_vigencia || new Date().toISOString().split('T')[0]]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/precios/venta
router.get('/venta', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (sku) sku, precio, tasa_iva, fecha_vigencia
       FROM lista_precios_venta WHERE activo=true
       ORDER BY sku, fecha_vigencia DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/precios/venta/batch
router.post('/venta/batch', authMiddleware, async (req, res) => {
  const { precios, fecha_vigencia } = req.body;
  if (!Array.isArray(precios)) return res.status(400).json({ error: 'precios requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE lista_precios_venta SET activo=false');
    for (const p of precios) {
      await client.query(
        `INSERT INTO lista_precios_venta (sku, precio, tasa_iva, fecha_vigencia)
         VALUES ($1,$2,$3,$4)`,
        [String(p.sku), p.precio, p.tasa_iva||0.16, fecha_vigencia || new Date().toISOString().split('T')[0]]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: precios.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
