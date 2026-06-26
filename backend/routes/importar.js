const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { importPDF } = require('../controllers/importController');

// Configuração do multer para upload de PDF
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authenticateToken);

router.post('/', requireRole('admin'), upload.single('pdf'), importPDF);

module.exports = router;
