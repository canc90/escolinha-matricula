const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { listDiario, getDiario, createDiario, updateDiario } = require('../controllers/diarioController');

router.use(authenticateToken);

router.get('/', listDiario);
router.get('/:id', getDiario);
router.post('/', createDiario);
router.put('/:id', updateDiario);

module.exports = router;
