const { Pool } = require('pg');
require('dotenv').config();

// Usar SUPABASE_URL. Si el puerto es 5432, cambiar a 6543 (connection pooler de Supabase)
let connString = process.env.SUPABASE_URL || '';
// Forzar puerto 6543 (Transaction pooler de Supabase - funciona desde servidores externos)
connString = connString.replace(':5432/', ':6543/');

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false }, // Supabase transaction pooler (6543) usa cert self-signed
  max: 10
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool de PostgreSQL:', err);
});

module.exports = pool;
