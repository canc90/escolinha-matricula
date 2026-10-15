const path = require('path');
const fs = require('fs');
const importService = require('../services/importService');
const db = require('../database/connection');
const resp = require('../services/responseService');
const logger = require('../services/loggerService');
const { MAPA_COLUNAS_PROFESSORAS } = importService;

function validarProfessora(normalized, row) {
  const errors = [];
  const nome = (normalized.nome || '').trim();
  if (!nome) errors.push('Nome vazio.');
  if (errors.length > 0) return { valid: false, errors };

  const email = (normalized.email || '').trim().toLowerCase();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { valid: false, errors: [`Email inválido: ${email}`] };
  }

  normalized.nome = nome;
  normalized.email = email;
  normalized.telefone = (normalized.telefone || '').trim();
  normalized.especialidade = (normalized.especialidade || '').trim();
  normalized.turma = (normalized.turma || '').trim();
  normalized.turno = (normalized.turno || '').trim();

  return { valid: true, errors: [] };
}

async function importarProfessorasCSV(req, res) {
  try {
    if (!req.file) return resp.fail(res, 'Arquivo CSV não enviado.');

    const filePath = req.file.path;
    const originalName = req.file.originalname || path.basename(filePath);
    const ext = path.extname(originalName).toLowerCase();

    if (ext !== '.csv') {
      fs.unlinkSync(filePath);
      return resp.fail(res, 'Apenas arquivos CSV são aceitos.');
    }

    const result = await importService.importCSV(filePath, 'professoras', MAPA_COLUNAS_PROFESSORAS, validarProfessora);

    fs.unlinkSync(filePath);

    logger.log(req.user?.id, 'import', 'professora', null, { count: result.inseridos.length });

    return res.json({
      message: 'Importação concluída.',
      arquivo: path.basename(originalName),
      totalLido: result.totalLido,
      totalImportado: result.inseridos.length,
      totalInvalidos: result.invalidos.length,
      totalErros: result.erros.length,
      importados: result.inseridos,
      invalidos: result.invalidos.map(i => ({ nome: i.nome, motivo: i.motivo })),
      erros: result.erros,
    });
  } catch (error) {
    console.error('Erro na importação de professoras:', error);
    return resp.serverError(res, error.message);
  }
}

module.exports = { importarProfessorasCSV };
