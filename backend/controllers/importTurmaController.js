const path = require('path');
const fs = require('fs');
const importService = require('../services/importService');
const db = require('../database/connection');
const resp = require('../services/responseService');
const logger = require('../services/loggerService');

const MAPA_COLUNAS_TURMAS = {
  'nome': 'nome',
  'nometurma': 'nome',
  'turma': 'nome',
  'turno': 'turno',
  'anoletivo': 'ano_letivo',
  'ano': 'ano_letivo',
};

function validarTurma(normalized) {
  const errors = [];
  const nome = (normalized.nome || '').trim();
  if (!nome) errors.push('Nome da turma vazio.');
  if (errors.length > 0) return { valid: false, errors };
  normalized.nome = nome;
  normalized.turno = (normalized.turno || '').trim();
  normalized.ano_letivo = (normalized.ano_letivo || new Date().getFullYear().toString()).trim();
  return { valid: true, errors: [] };
}

async function importarTurmasCSV(req, res) {
  try {
    if (!req.file) return resp.fail(res, 'Arquivo CSV não enviado.');
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname || filePath).toLowerCase();
    if (ext !== '.csv') { fs.unlinkSync(filePath); return resp.fail(res, 'Apenas arquivos CSV são aceitos.'); }

    const result = await importService.importCSV(filePath, 'turmas', MAPA_COLUNAS_TURMAS, validarTurma);
    fs.unlinkSync(filePath);
    logger.log(req.user?.id, 'import', 'turma', null, { count: result.inseridos.length });

    return res.json({
      message: 'Importação concluída.',
      arquivo: path.basename(req.file.originalname || filePath),
      totalLido: result.totalLido,
      totalImportado: result.inseridos.length,
      totalInvalidos: result.invalidos.length,
      totalErros: result.erros.length,
      importados: result.inseridos,
      invalidos: result.invalidos.map(i => ({ nome: i.nome, motivo: i.motivo })),
      erros: result.erros,
    });
  } catch (error) {
    console.error('Erro na importação de turmas:', error);
    return resp.serverError(res, error.message);
  }
}

module.exports = { importarTurmasCSV };
