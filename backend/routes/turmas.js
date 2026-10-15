const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  listTurmas, getTurma, createTurma, updateTurma, deleteTurma,
  listProfessorasDaTurma, listarTurmasDaProfessora, vincularProfessora, desvincularProfessora,
} = require('../controllers/turmaController');

router.use(authenticateToken);

router.get('/', listTurmas);
router.get('/:id', getTurma);
router.post('/', createTurma);
router.put('/:id', updateTurma);
router.delete('/:id', requireRole('admin'), deleteTurma);

// Vínculo professora-turma
router.get('/:id/professoras', listProfessorasDaTurma);
router.get('/professora/:id/turmas', listarTurmasDaProfessora);
router.post('/:id/professoras', requireRole('admin'), vincularProfessora);
router.delete('/:id/professora/:professoraId', requireRole('admin'), desvincularProfessora);

module.exports = router;
