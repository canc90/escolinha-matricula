const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { validateProfessoraInput } = require('../middleware/validate');
const {
  listProfessoras,
  getProfessora,
  createProfessora,
  updateProfessora,
  deleteProfessora,
  criarLoginProfessora,
} = require('../controllers/professoraController');

router.use(authenticateToken);

router.get('/', listProfessoras);
router.get('/:id', getProfessora);
router.post('/', validateProfessoraInput, createProfessora);
router.put('/:id', validateProfessoraInput, updateProfessora);
router.delete('/:id', requireRole('admin'), deleteProfessora);
router.post('/:id/criar-login', requireRole('admin'), criarLoginProfessora);

module.exports = router;
