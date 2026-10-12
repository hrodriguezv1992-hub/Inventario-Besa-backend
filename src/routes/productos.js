const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/productos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE activo = true ORDER BY orden, sku'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos
router.post('/', authMiddleware, async (req, res) => {
  const { sku, nombre, tipo, empaque, cajas_tarima, mililitros, min_paquetes, solo_tarima, orden } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO productos (sku, nombre, tipo, empaque, cajas_tarima, mililitros, min_paquetes, solo_tarima, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (sku) DO UPDATE SET
         nombre=EXCLUDED.nombre, tipo=EXCLUDED.tipo, empaque=EXCLUDED.empaque,
         cajas_tarima=EXCLUDED.cajas_tarima, mililitros=EXCLUDED.mililitros,
         min_paquetes=EXCLUDED.min_paquetes, solo_tarima=EXCLUDED.solo_tarima,
         orden=EXCLUDED.orden, updated_at=NOW()
       RETURNING *`,
      [sku, nombre, tipo || '', empaque || 0, cajas_tarima || 0, mililitros || 0, min_paquetes || 0, solo_tarima || false, orden || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/:sku
router.put('/:sku', authMiddleware, async (req, res) => {
  const { sku } = req.params;
  const { nombre, tipo, empaque, cajas_tarima, mililitros, min_paquetes, solo_tarima, orden } = req.body;
  try {
    const result = await pool.query(
      `UPDATE productos SET nombre=$1, tipo=$2, empaque=$3, cajas_tarima=$4, mililitros=$5,
       min_paquetes=$6, solo_tarima=$7, orden=$8, updated_at=NOW() WHERE sku=$9 RETURNING *`,
      [nombre, tipo, empaque, cajas_tarima, mililitros, min_paquetes, solo_tarima, orden, sku]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/productos/:sku
router.delete('/:sku', authMiddleware, async (req, res) => {
  const { sku } = req.params;
  try {
    await pool.query('UPDATE productos SET activo=false WHERE sku=$1', [sku]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos/batch - importar múltiples productos
router.post('/batch', authMiddleware, async (req, res) => {
  const { productos } = req.body;
  if (!Array.isArray(productos)) return res.status(400).json({ error: 'Se esperaba un array' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of productos) {
      await client.query(
        `INSERT INTO productos (sku, nombre, tipo, empaque, cajas_tarima, mililitros, min_paquetes, solo_tarima, orden)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (sku) DO UPDATE SET
           nombre=EXCLUDED.nombre, tipo=EXCLUDED.tipo, empaque=EXCLUDED.empaque,
           cajas_tarima=EXCLUDED.cajas_tarima, mililitros=EXCLUDED.mililitros,
           min_paquetes=EXCLUDED.min_paquetes, solo_tarima=EXCLUDED.solo_tarima,
           orden=EXCLUDED.orden, activo=true, updated_at=NOW()`,
        [p.sku, p.nombre, p.tipo||'', p.empaque||0, p.cajas_tarima||0, p.mililitros||0, p.min_paquetes||0, p.solo_tarima||false, p.orden||0]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, count: productos.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
