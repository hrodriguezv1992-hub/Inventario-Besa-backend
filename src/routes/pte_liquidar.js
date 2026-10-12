const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/pte-liquidar
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pte_liquidar ORDER BY fecha_alta, sku'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pte-liquidar
router.post('/', authMiddleware, async (req, res) => {
  const { sku, cantidad, motivo, fecha_alta } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pte_liquidar (sku, cantidad, motivo, fecha_alta)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [String(sku), cantidad, motivo||'', fecha_alta]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pte-liquidar/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { sku, cantidad, motivo, fecha_alta } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pte_liquidar SET sku=$1, cantidad=$2, motivo=$3, fecha_alta=$4
       WHERE id=$5 RETURNING *`,
      [String(sku), cantidad, motivo, fecha_alta, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pte-liquidar/:id (liquidar)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE pte_liquidar SET liquidado=true, fecha_liquidacion=CURRENT_DATE WHERE id=$1`, [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pte-liquidar/batch - reemplazar toda la lista
router.post('/batch', authMiddleware, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Marcar todos como liquidados primero
    await client.query('UPDATE pte_liquidar SET liquidado=true, fecha_liquidacion=CURRENT_DATE WHERE liquidado=false');
    // Insertar los nuevos
    for (const item of items) {
      await client.query(
        `INSERT INTO pte_liquidar (sku, cantidad, motivo, fecha_alta)
         VALUES ($1,$2,$3,$4)`,
        [String(item.sku), item.cantidad, item.motivo||'', item.fecha_alta]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
