const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { importarTurmasCSV } = require('../controllers/importTurmaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são aceitos.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticateToken);
router.post('/', requireRole('admin'), upload.single('csv'), importarTurmasCSV);

module.exports = router;
