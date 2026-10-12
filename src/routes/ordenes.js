const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/ordenes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordenes_compra ORDER BY created_at DESC');
    const ordenes = result.rows;
    // Traer items de cada orden
    for (const o of ordenes) {
      const items = await pool.query(
        'SELECT * FROM ordenes_compra_items WHERE orden_id=$1', [o.id]
      );
      o.items = items.rows;
    }
    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ordenes
router.post('/', authMiddleware, async (req, res) => {
  const { folio, trailer_label, fecha, hora, notas, total_tarimas, total_paquetes, items } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO ordenes_compra (folio, trailer_label, fecha, hora, notas, total_tarimas, total_paquetes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [folio, trailer_label, fecha, hora, notas, total_tarimas, total_paquetes]
    );
    const orden = result.rows[0];
    if (Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO ordenes_compra_items (orden_id, sku, nombre, tarimas, paquetes, dias_existencia, cajas_tarima)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [orden.id, item.sku, item.nombre, item.tarimas, item.paquetes, item.dias_existencia, item.cajas_tarima]
        );
      }
    }
    await client.query('COMMIT');
    orden.items = items || [];
    res.json(orden);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/ordenes/:id/recibida
router.put('/:id/recibida', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE ordenes_compra SET estado='Recibida', updated_at=NOW() WHERE id=$1`, [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ordenes/:id/notas
router.put('/:id/notas', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;
  try {
    await pool.query(
      'UPDATE ordenes_compra SET notas=$1, updated_at=NOW() WHERE id=$2', [notas, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
