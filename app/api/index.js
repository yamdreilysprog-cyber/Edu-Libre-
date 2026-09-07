require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const requestId = require('./middlewares/requestId');
const { errorHandler } = require('./middlewares/validator');
const authRoutes = require('./routes/authRoutes');
const institutionRoutes = require('./routes/institutionRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const programRoutes = require('./routes/programRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'CLIENT_URL'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

app.use(helmet());

const allowedOrigins = process.env.CLIENT_URL
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Bloqueado por CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../client/superior-singularity/dist')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', requestId: req.requestId });
});

// authLimiter ya no se aplica aquí a TODO /api/auth -- ahora vive dentro de
// authRoutes.js, aplicado solo a register/register-institution/login.
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all route para SPA (Astro/React router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/superior-singularity/dist', 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    // Servidor iniciado
  });
}

module.exports = app;
