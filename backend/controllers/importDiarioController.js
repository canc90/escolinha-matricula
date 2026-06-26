const path = require('path');
const fs = require('fs');
const db = require('../database/connection');
const resp = require('../services/responseService');
const logger = require('../services/loggerService');

const MAPA_COLUNAS_DIARIO = {
  'turma': 'turma_nome',
  'turmanome': 'turma_nome',
  'nometurma': 'turma_nome',
  'data': 'data',
  'conteudo': 'conteudo_aula',
  'aula': 'conteudo_aula',
  'conteudoaula': 'conteudo_aula',
  'conteudo_aula': 'conteudo_aula',
  'observacoes': 'observacoes',
  'obs': 'observacoes',
  'anotacoes': 'observacoes',
};

function normalizarColunas(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = MAPA_COLUNAS_DIARIO[normalizedKey];
    if (target && (!result[target] || (typeof val === 'string' && val.trim()))) {
      result[target] = val;
    }
  }
  return result;
}

function validarRegistro(normalized) {
  const errors = [];
  if (!normalized.turma_nome || !normalized.turma_nome.trim()) errors.push('Nome da turma vazio.');
  if (!normalized.data || !normalized.data.trim()) errors.push('Data vazia.');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.data.trim())) errors.push('Data inválida (use AAAA-MM-DD).');
  if (!normalized.conteudo_aula || !normalized.conteudo_aula.trim()) errors.push('Conteúdo vazio.');
  if (errors.length > 0) return { valid: false, errors };
  normalized.turma_nome = normalized.turma_nome.trim();
  normalized.data = normalized.data.trim();
  normalized.conteudo_aula = normalized.conteudo_aula.trim();
  normalized.observacoes = (normalized.observacoes || '').trim();
  return { valid: true, errors: [] };
}

async function importarDiarioCSV(req, res) {
  try {
    if (!req.file) return resp.fail(res, 'Arquivo CSV não enviado.');
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname || filePath).toLowerCase();
    if (ext !== '.csv') { fs.unlinkSync(filePath); return resp.fail(res, 'Apenas arquivos CSV são aceitos.'); }

    const content = fs.readFileSync(filePath, 'utf-8');
    const csv = require('csv-parse/sync');
    const registros = csv.parse(content, {
      columns: true, skip_empty_lines: true, trim: true,
      delimiter: content.includes(';') ? ';' : content.includes('\t') ? '\t' : ',',
      relax_column_count: true, bom: true,
    });

    const validos = [];
    const invalidos = [];

    for (const row of registros) {
      const normalized = normalizarColunas(row);
      const { valid, errors } = validarRegistro(normalized);
      if (valid) {
        validos.push(normalized);
      } else {
        invalidos.push({ nome: row.Turma || row.turma || '(sem turma)', motivo: errors.join('; ') });
      }
    }

    const inseridos = [];
    const erros = [];

    for (const item of validos) {
      try {
        const turma = await db('turmas').where({ nome: item.turma_nome, deleted: false }).select('id').first();
        if (!turma) { erros.push({ nome: item.turma_nome, erro: `Turma não encontrada: ${item.turma_nome}` }); continue; }
        const [id] = await db('diario_classe').insert({
          turma_id: turma.id,
          data: item.data,
          conteudo_aula: item.conteudo_aula,
          observacoes: item.observacoes || null,
        });
        inseridos.push({ id, turma: item.turma_nome, data: item.data });
      } catch (err) {
        if (err.message?.includes('UNIQUE')) {
          erros.push({ nome: `${item.turma_nome} - ${item.data}`, erro: 'Registro duplicado.' });
        } else {
          erros.push({ nome: `${item.turma_nome} - ${item.data}`, erro: err.message });
        }
      }
    }

    fs.unlinkSync(filePath);
    logger.log(req.user?.id, 'import', 'diario', null, { count: inseridos.length });

    return res.json({
      message: 'Importação concluída.',
      arquivo: path.basename(req.file.originalname || filePath),
      totalLido: registros.length,
      totalImportado: inseridos.length,
      totalInvalidos: invalidos.length,
      totalErros: erros.length,
      importados: inseridos,
      invalidos: invalidos.map(i => ({ nome: i.nome, motivo: i.motivo })),
      erros,
    });
  } catch (error) {
    console.error('Erro na importação de diário:', error);
    return resp.serverError(res, error.message);
  }
}

module.exports = { importarDiarioCSV };
