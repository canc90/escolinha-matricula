const db = require('../database/connection');
const fs = require('fs');
const csv = require('csv-parse/sync');

const MAPA_COLUNAS_PROFESSORAS = {
  'nome': 'nome',
  'nome_professor': 'nome',
  'professor': 'nome',
  'email': 'email',
  'e-mail': 'email',
  'telefone': 'telefone',
  'tel': 'telefone',
  'contato': 'telefone',
  'especialidade': 'especialidade',
  'especializacao': 'especialidade',
  'formacao': 'especialidade',
  'turma': 'turma',
  'turmasacesso': 'turma',
  'turmas': 'turma',
  'turno': 'turno',
};

function detectDelimiter(content) {
  const firstLine = content.split('\n')[0] || '';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  return ',';
}

function readCSV(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  const delimiter = detectDelimiter(content);

  return csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    relax_column_count: true,
    bom: true,
  });
}

function normalizeColumns(row, columnMap) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = columnMap[normalizedKey];
    if (target && (!result[target] || (typeof val === 'string' && val.trim()))) {
      result[target] = val;
    }
  }
  return result;
}

async function importCSV(filePath, tableName, columnMap, validators) {
  const registros = readCSV(filePath);
  const validos = [];
  const invalidos = [];

  for (const row of registros) {
    const normalized = normalizeColumns(row, columnMap);
    const { valid, errors } = validators(normalized, row);
    if (valid) {
      validos.push(normalized);
    } else {
      invalidos.push({ nome: row.Nome || row.nome || '(sem nome)', motivo: errors.join('; ') });
    }
  }

  const resultado = await db.transaction(async (trx) => {
    const inseridos = [];
    const erros = [];
    for (const item of validos) {
      try {
        const [id] = await trx(tableName).insert({ ...item, deleted: false });
        inseridos.push({ id, nome: item.nome, email: item.email || '' });
      } catch (err) {
        erros.push({ nome: item.nome, erro: err.message });
      }
    }
    return { inseridos, erros };
  });

  return { totalLido: registros.length, ...resultado, invalidos };
}

module.exports = { readCSV, normalizeColumns, importCSV, MAPA_COLUNAS_PROFESSORAS, detectDelimiter };
