const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'fotos');
const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(12).toString('hex') + ext;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagem inválido. Use JPG, PNG ou WebP.'), false);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

function uploadSingle(fieldName) {
  return upload.single(fieldName);
}

function getUrl(req, filename) {
  return '/uploads/fotos/' + filename;
}

module.exports = { uploadSingle, getUrl, UPLOAD_DIR };
