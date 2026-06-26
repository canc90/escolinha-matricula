const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { matricula, cadastroProfessora } = require('../controllers/publicController');
const { validateAlunoInput, validateProfessoraInput } = require('../middleware/validate');
const uploadService = require('../services/uploadService');
const { uploadFoto } = require('../controllers/uploadController');

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/matricula', publicLimiter, validateAlunoInput, matricula);
router.post('/professoras', publicLimiter, validateProfessoraInput, cadastroProfessora);
router.post('/upload', uploadLimiter, uploadService.uploadSingle('foto'), uploadFoto);
router.post('/upload-documento', uploadLimiter, uploadService.uploadSingle('documento'), uploadFoto);

module.exports = router;
