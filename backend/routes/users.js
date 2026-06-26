const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const userController = require('../controllers/userController');

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/', userController.listar);
router.get('/:id', userController.obter);
router.post('/', userController.criar);
router.put('/:id', userController.atualizar);
router.delete('/:id', userController.excluir);

module.exports = router;