const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/movimientos?fecha=2026-06-02&tipo=venta&desde=2026-06-01&hasta=2026-06-30
router.get('/', authMiddleware, async (req, res) => {
  const { fecha, tipo, desde, hasta } = req.query;
  try {
    let q = 'SELECT * FROM movimientos WHERE 1=1';
    const params = [];
    if (fecha)  { params.push(fecha);  q += ` AND fecha=$${params.length}`; }
    if (tipo)   { params.push(tipo);   q += ` AND tipo=$${params.length}`; }
    if (desde)  { params.push(desde);  q += ` AND fecha>=$${params.length}`; }
    if (hasta)  { params.push(hasta);  q += ` AND fecha<=$${params.length}`; }
    q += ' ORDER BY fecha, created_at';
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movimientos/batch - guardar múltiples movimientos (reemplaza los del día+tipo)
router.post('/batch', authMiddleware, adminOnly, async (req, res) => {
  const { fecha, tipo, items, confirmado, grupo_importacion } = req.body;
  if (!fecha || !tipo || !Array.isArray(items)) {
    return res.status(400).json({ error: 'fecha, tipo e items requeridos' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Para compras con grupo: eliminar solo ese grupo
    if (tipo === 'compra' && grupo_importacion) {
      await client.query(
        'DELETE FROM movimientos WHERE fecha=$1 AND tipo=$2 AND grupo_importacion=$3',
        [fecha, tipo, grupo_importacion]
      );
    } else {
      // Para otros tipos: reemplazar TODO el día
      await client.query(
        'DELETE FROM movimientos WHERE fecha=$1 AND tipo=$2', [fecha, tipo]
      );
    }
    for (const item of items) {
      await client.query(
        `INSERT INTO movimientos (fecha, tipo, sku, cantidad, folio, grupo_importacion, costo, confirmado, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [fecha, tipo, item.sku, item.cantidad, item.folio||null,
         grupo_importacion||null, item.costo||null, confirmado||false, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: items.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/movimientos/:id - editar un movimiento individual
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { cantidad, folio } = req.body;
  try {
    const result = await pool.query(
      'UPDATE movimientos SET cantidad=$1, folio=$2 WHERE id=$3 RETURNING *',
      [cantidad, folio, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/movimientos/fecha - eliminar todos los movimientos de una fecha+tipo
router.delete('/fecha', authMiddleware, adminOnly, async (req, res) => {
  const { fecha, tipo } = req.body;
  if (!fecha || !tipo) return res.status(400).json({ error: 'fecha y tipo requeridos' });
  try {
    const result = await pool.query(
      'DELETE FROM movimientos WHERE fecha=$1 AND tipo=$2', [fecha, tipo]
    );
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/movimientos/grupo/:grupo - eliminar factura completa
router.delete('/grupo/:grupo', authMiddleware, adminOnly, async (req, res) => {
  const { grupo } = req.params;
  try {
    await pool.query('DELETE FROM movimientos WHERE grupo_importacion=$1', [grupo]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movimientos/confirmar - confirmar movimientos de un tipo+fecha
router.post('/confirmar', authMiddleware, adminOnly, async (req, res) => {
  const { fecha, tipo } = req.body;
  try {
    await pool.query(
      'UPDATE movimientos SET confirmado=true WHERE fecha=$1 AND tipo=$2',
      [fecha, tipo]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
