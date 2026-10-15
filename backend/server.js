require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const setupDatabase = require('./database/setup');

const authRoutes = require('./routes/auth');
const alunosRoutes = require('./routes/alunos');
const professorasRoutes = require('./routes/professoras');
const turmasRoutes = require('./routes/turmas');
const diarioRoutes = require('./routes/diario');
const frequenciasRoutes = require('./routes/frequencias');
const importarRoutes = require('./routes/importar');
const importarAlunosRoutes = require('./routes/importarAlunos');
const importarProfessorasRoutes = require('./routes/importarProfessoras');
const importarTurmasRoutes = require('./routes/importarTurmas');
const importarDiarioRoutes = require('./routes/importarDiario');
const auditoriaRoutes = require('./routes/auditoria');
const metricsRoutes = require('./routes/metrics');
const biRoutes = require('./routes/bi');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const scheduler = require('./services/schedulerService');
const publicRoutes = require('./routes/public');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security & parsing middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no auth, before global rate limit)
app.use('/api/public', publicRoutes);

// Global rate limit: 500 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/login' || req.path.startsWith('/api/login'),
});
app.use('/api', globalLimiter);

// Serve static frontend files
app.use(express.static(path.resolve(__dirname, '..', 'frontend')));

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// API Routes
app.use('/api', authRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/professoras', professorasRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/diario', diarioRoutes);
app.use('/api/frequencias', frequenciasRoutes);
app.use('/api/importar-pdf', importarRoutes);
app.use('/api/importar', importarAlunosRoutes);
app.use('/api/importar-professoras', importarProfessorasRoutes);
app.use('/api/importar-turmas', importarTurmasRoutes);
app.use('/api/importar-diario', importarDiarioRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);

// Fallback: serve frontend pages
app.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'login.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dashboard.html'));
});
app.get('/alunos-page', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'alunos.html'));
});
app.get('/aluno-page', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'aluno.html'));
});
app.get('/professoras', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'professoras.html'));
});
app.get('/dashboard-professora', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dashboard-professora.html'));
});
app.get('/turmas-page', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'turmas.html'));
});
app.get('/diario-page', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'diario.html'));
});
app.get('/frequencias', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'frequencias.html'));
});
app.get('/importacao', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'importacao.html'));
});
app.get('/visualizar-chamadas', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'visualizar-chamadas.html'));
});
app.get('/dashboard-pedagogico', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dashboard-pedagogico.html'));
});
app.get('/direcao', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'direcao.html'));
});
app.get('/ia-educacional', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'ia-educacional.html'));
});
app.get('/users', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'users.html'));
});
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Global error handler — padronizado
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo excede o tamanho máximo permitido (10MB).'
      : `Erro no upload: ${err.message}`;
    return res.status(400).json({ error: msg });
  }

  if (err.message === 'Apenas arquivos PDF são aceitos.' || err.message === 'Apenas arquivos CSV são aceitos.') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// Start server
async function start() {
  await setupDatabase();
  scheduler.iniciar();
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
