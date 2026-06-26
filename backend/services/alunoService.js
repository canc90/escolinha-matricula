const repo = require('../repositories/alunoRepository');

const ALLOWED_UPDATE_FIELDS = [
  'id_alu', 'nome', 'data_nascimento', 'genero',
  'endereco_rua', 'endereco_bairro', 'endereco_cidade',
  'nome_pai', 'contato_pai', 'nome_mae', 'contato_mae', 'email_aluno',
  'alergia_intolerancia', 'descricao_alergia',
  'usa_medicamento', 'necessita_atencao_medicamento',
  'autorizacao_fotos_redes', 'autorizacao_passeios',
  'pode_brincar_areia', 'aniversario_escola', 'observacoes_aniversario_escola',
  'contato_emergencia_nome', 'contato_emergencia_telefone',
  'responsaveis_retirada', 'turma', 'turno', 'foto', 'foto_documento',
  'cpf_aluno', 'cpf_pai', 'cpf_mae',
];

const BOOLEAN_FIELDS = [
  'alergia_intolerancia', 'usa_medicamento', 'necessita_atencao_medicamento',
  'autorizacao_fotos_redes', 'autorizacao_passeios', 'pode_brincar_areia',
  'aniversario_escola',
];

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function buildFilters(query) {
  const filters = {};
  if (query.turma) filters.turma = query.turma;
  if (query.turma_id) filters.turma_id = parseInt(query.turma_id, 10);
  if (query.turno) filters.turno = query.turno;
  if (query.search) filters.search = query.search;
  return filters;
}

function sanitizeUpdateBody(body) {
  const data = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  for (const field of BOOLEAN_FIELDS) {
    if (field in data) data[field] = !!data[field];
  }
  return data;
}

async function list(filters, page, limit, offset) {
  const [total, alunos] = await Promise.all([
    repo.count(filters),
    repo.list(filters, page, limit, offset),
  ]);
  const totalPages = Math.ceil(total / limit);
  return { alunos, total, page, totalPages };
}

async function getById(id) {
  return repo.findById(id);
}

async function create(data) {
  const cleanData = sanitizeUpdateBody(data);
  const [id] = await repo.insert(cleanData);
  return repo.findById(id);
}

async function upsert(data) {
  const cleanData = sanitizeUpdateBody(data);
  const existing = await repo.findByUnique(
    cleanData.nome,
    cleanData.data_nascimento,
    cleanData.nome_mae
  );
  if (existing) {
    await repo.update(existing.id, cleanData);
    return repo.findById(existing.id);
  }
  const [id] = await repo.insert(cleanData);
  return repo.findById(id);
}

async function update(id, body) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  const data = sanitizeUpdateBody(body);
  await repo.update(id, data);
  return repo.findById(id);
}

async function remove(id) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  await repo.softDelete(id);
  return true;
}

module.exports = { parsePagination, buildFilters, list, getById, create, update, upsert, remove };
