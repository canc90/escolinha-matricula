const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  dashboardDirecao, evolucaoPresenca,
  rankingTurmas, rankingProfessoras, kpisCompostos,
} = require('../controllers/biController');

router.use(authenticateToken);
router.get('/dashboard-direcao', requireRole('admin', 'direcao'), dashboardDirecao);
router.get('/evolucao-presenca', evolucaoPresenca);
router.get('/ranking-turmas', requireRole('admin', 'direcao', 'pedagogico'), rankingTurmas);
router.get('/ranking-professoras', requireRole('admin', 'direcao', 'pedagogico'), rankingProfessoras);
router.get('/kpis-compostos', requireRole('admin', 'direcao', 'pedagogico'), kpisCompostos);

module.exports = router;
