const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  riscoAluno, riscoTurma, riscoDashboard,
  recomendacoesAluno,
  listarAlertas, resolverAlerta, gerarAlertasAutomaticos,
} = require('../controllers/aiController');

router.use(authenticateToken);

// Risk
router.get('/risk/aluno/:id', riscoAluno);
router.get('/risk/turma/:id', riscoTurma);
router.get('/risk/dashboard', requireRole('admin'), riscoDashboard);

// Recommendations
router.get('/recommendations/aluno/:id', recomendacoesAluno);

// Alerts
router.get('/alerts', listarAlertas);
router.post('/alerts/:id/resolve', resolverAlerta);
router.post('/alerts/gerar', requireRole('admin'), gerarAlertasAutomaticos);

module.exports = router;
