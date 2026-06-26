const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadFoto } = require('../controllers/uploadController');
const uploadService = require('../services/uploadService');

router.post('/foto', authenticateToken, uploadService.uploadSingle('foto'), uploadFoto);
router.post('/documento', authenticateToken, uploadService.uploadSingle('documento'), uploadFoto);

module.exports = router;
