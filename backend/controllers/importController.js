const { importarPDF } = require('../services/pdfImportService');
const path = require('path');

async function importPDF(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo PDF não enviado.' });
    }

    const filePath = req.file.path;
    console.log(`📥 Importando PDF: ${filePath}`);

    const resultado = await importarPDF(filePath);
    
    return res.json({
      message: 'Importação concluída.',
      ...resultado,
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { importPDF };
