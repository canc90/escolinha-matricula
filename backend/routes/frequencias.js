const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getFrequencias,
  salvarFrequencias,
  getHistorico,
  getRelatorio,
} = require('../controllers/frequenciasController');

router.use(authenticateToken);

router.get('/', getFrequencias);
router.post('/', salvarFrequencias);
router.get('/historico', getHistorico);
router.get('/relatorio', getRelatorio);

module.exports = router;
