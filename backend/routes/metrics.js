const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  presencaGeral, presencaPorTurma,
  atividadeProfessoras, diarioResumo, evolucaoSemanal,
} = require('../controllers/metricsController');

router.use(authenticateToken);

router.get('/presenca-geral', presencaGeral);
router.get('/presenca-por-turma', presencaPorTurma);
router.get('/atividade-professoras', atividadeProfessoras);
router.get('/diario-resumo', diarioResumo);
router.get('/evolucao-semanal', evolucaoSemanal);

module.exports = router;
