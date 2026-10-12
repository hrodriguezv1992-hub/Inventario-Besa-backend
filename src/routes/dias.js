const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// GET /api/dias/:fecha - obtener info del día
router.get('/:fecha', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  try {
    const dia = await pool.query('SELECT * FROM dias WHERE fecha=$1', [fecha]);
    const stockInicial = await pool.query(
      'SELECT sku, cantidad FROM stock_inicial WHERE fecha=$1', [fecha]
    );
    const conteos = await pool.query(
      'SELECT sku, cantidad, confirmado FROM conteos WHERE fecha=$1', [fecha]
    );
    // Movimientos agrupados por tipo
    const movs = await pool.query(
      'SELECT tipo, sku, SUM(cantidad) as total FROM movimientos WHERE fecha=$1 GROUP BY tipo, sku', [fecha]
    );
    // Pte. Liquidar (vivos)
    const pteLiq = await pool.query(
      `SELECT sku, SUM(cantidad) as total FROM pte_liquidar
       WHERE liquidado=false AND fecha_alta <= $1 GROUP BY sku`, [fecha]
    );
    // Snapshot pte liquidar si el día está cerrado
    let pteLiqSnap = null;
    if (dia.rows[0] && dia.rows[0].cerrado) {
      const snap = await pool.query(
        'SELECT sku, cantidad FROM pte_liquidar_snapshot WHERE fecha=$1', [fecha]
      );
      pteLiqSnap = snap.rows;
    }

    res.json({
      dia: dia.rows[0] || { fecha, cerrado: false, es_inhabil: false },
      stockInicial: stockInicial.rows,
      conteos: conteos.rows,
      movimientos: movs.rows,
      pteLiquidar: pteLiq.rows,
      pteLiquidarSnapshot: pteLiqSnap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dias/:fecha/cerrar
router.post('/:fecha/cerrar', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  const { stockFinal, pteLiquidarSnapshot } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Marcar día como cerrado
    await client.query(
      `INSERT INTO dias (fecha, cerrado) VALUES ($1, true)
       ON CONFLICT (fecha) DO UPDATE SET cerrado=true, updated_at=NOW()`, [fecha]
    );
    // Guardar stock final como stock inicial del siguiente día
    const nextDate = new Date(fecha);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextFecha = nextDate.toISOString().split('T')[0];

    if (Array.isArray(stockFinal)) {
      for (const s of stockFinal) {
        await client.query(
          `INSERT INTO stock_inicial (fecha, sku, cantidad) VALUES ($1,$2,$3)
           ON CONFLICT (fecha, sku) DO UPDATE SET cantidad=EXCLUDED.cantidad`,
          [nextFecha, s.sku, s.cantidad]
        );
      }
    }
    // Guardar snapshot de pte liquidar
    if (Array.isArray(pteLiquidarSnapshot)) {
      for (const p of pteLiquidarSnapshot) {
        await client.query(
          `INSERT INTO pte_liquidar_snapshot (fecha, sku, cantidad) VALUES ($1,$2,$3)
           ON CONFLICT (fecha, sku) DO UPDATE SET cantidad=EXCLUDED.cantidad`,
          [fecha, p.sku, p.cantidad]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true, siguienteFecha: nextFecha });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/dias/:fecha/reabrir
router.post('/:fecha/reabrir', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  try {
    await pool.query(
      `UPDATE dias SET cerrado=false, updated_at=NOW() WHERE fecha=$1`, [fecha]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dias/:fecha/saltar (día inhábil)
router.post('/:fecha/saltar', authMiddleware, async (req, res) => {
  const { fecha } = req.params;
  try {
    await pool.query(
      `INSERT INTO dias (fecha, cerrado, es_inhabil) VALUES ($1, true, true)
       ON CONFLICT (fecha) DO UPDATE SET cerrado=true, es_inhabil=true, updated_at=NOW()`, [fecha]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
