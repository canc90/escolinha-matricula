const uploadService = require('../services/uploadService');

async function uploadFoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  }
  const url = uploadService.getUrl(req, req.file.filename);
  return res.json({ url });
}

module.exports = { uploadFoto };
