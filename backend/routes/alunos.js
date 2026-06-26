const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateAlunoInput } = require('../middleware/validate');
const {
  listAlunos,
  getAluno,
  createAluno,
  updateAluno,
  deleteAluno,
} = require('../controllers/alunoController');

router.use(authenticateToken);

router.get('/', listAlunos);
router.get('/:id', getAluno);
router.post('/', validateAlunoInput, createAluno);
router.put('/:id', validateAlunoInput, updateAluno);
router.delete('/:id', requireRole('admin'), deleteAluno);

module.exports = router;
