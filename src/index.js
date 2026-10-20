require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad: headers HTTP
app.use(helmet());

// Middleware
app.use(cors({
  origin: [
    'https://hrodriguezv1992-hub.github.io',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting general — 200 requests por IP cada 15 minutos
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta en unos minutos' },
});
app.use('/api/', generalLimiter);

// Rutas
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/productos',    require('./routes/productos'));
app.use('/api/dias',         require('./routes/dias'));
app.use('/api/movimientos',  require('./routes/movimientos'));
app.use('/api/conteos',      require('./routes/conteos'));
app.use('/api/pte-liquidar', require('./routes/pte_liquidar'));
app.use('/api/precios',      require('./routes/precios'));
app.use('/api/ordenes',      require('./routes/ordenes'));
app.use('/api/usuarios',     require('./routes/usuarios'));
app.use('/api/equivalencias',require('./routes/equivalencias'));
app.use('/api/log',          require('./routes/log'));
app.use('/api/sync',         require('./routes/sync'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'desconectada', error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Error global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ InventaPro API corriendo en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  // Diagnóstico de variables de entorno
  const dbUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL || '(no definida)';
  const dbHost = dbUrl.includes('@') ? dbUrl.split('@')[1].split('/')[0] : dbUrl;
  console.log(`   DB host: ${dbHost}`);
});
