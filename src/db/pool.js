const { Pool } = require('pg');
require('dotenv').config();

// IMPORTANTE: usar SUPABASE_URL (no DATABASE_URL, que Railway sobreescribe internamente)
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool de PostgreSQL:', err);
});

module.exports = pool;
