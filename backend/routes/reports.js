const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  presencaCSV, turmasCSV, professorasCSV,
  relatorioGeralPDF, relatorioTurmaPDF, relatorioProfessoraPDF,
} = require('../controllers/reportController');

router.use(authenticateToken);

// CSV
router.get('/presenca.csv', presencaCSV);
router.get('/turmas.csv', turmasCSV);
router.get('/professoras.csv', professorasCSV);

// PDF
router.get('/geral.pdf', relatorioGeralPDF);
router.get('/turma/:id.pdf', relatorioTurmaPDF);
router.get('/professora/:id.pdf', relatorioProfessoraPDF);

module.exports = router;
