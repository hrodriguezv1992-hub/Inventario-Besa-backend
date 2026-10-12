const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/usuarios
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;
  if (!nombre || !usuario || !password) {
    return res.status(400).json({ error: 'nombre, usuario y password requeridos' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
       VALUES ($1,$2,$3,$4) RETURNING id, nombre, usuario, rol, activo`,
      [nombre, usuario, hash, rol || 'operador']
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, rol, activo, password, modulos } = req.body;
  try {
    // Build dynamic SET clause with only provided fields
    const fields = [];
    const values = [];
    let i = 1;
    if (nombre    !== undefined) { fields.push(`nombre=$${i++}`);        values.push(nombre); }
    if (usuario   !== undefined) { fields.push(`usuario=$${i++}`);       values.push(usuario); }
    if (rol       !== undefined) { fields.push(`rol=$${i++}`);           values.push(rol); }
    if (activo    !== undefined) { fields.push(`activo=$${i++}`);        values.push(activo); }
    if (modulos   !== undefined) { fields.push(`modulos=$${i++}`);       values.push(modulos); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash=$${i++}`);
      values.push(hash);
    }
    if (fields.length === 0) return res.json({ ok: true });
    fields.push(`updated_at=NOW()`);
    values.push(id);
    await pool.query(
      `UPDATE usuarios SET ${fields.join(',')} WHERE id=$${i}`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }
  try {
    await pool.query('UPDATE usuarios SET activo=false WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
