const repo = require('../repositories/diarioRepository');

const ALLOWED_FIELDS = ['turma_id', 'professora_id', 'data', 'conteudo_aula', 'observacoes'];

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function buildFilters(query) {
  const filters = {};
  if (query.turma_id) filters.turma_id = query.turma_id;
  if (query.data) filters.data = query.data;
  if (query.professora_id) filters.professora_id = query.professora_id;
  return filters;
}

function sanitize(body) {
  const data = {};
  for (const f of ALLOWED_FIELDS) {
    if (f in body) data[f] = body[f];
  }
  return data;
}

async function list(filters, page, limit, offset) {
  const [total, registros] = await Promise.all([
    repo.count(filters),
    repo.list(filters, limit, offset),
  ]);
  const totalPages = Math.ceil(total / limit);
  return { registros, total, page, totalPages };
}

async function getById(id) {
  return repo.findById(id);
}

async function create(body) {
  const data = sanitize(body);
  const [id] = await repo.insert(data);
  return repo.findById(id);
}

async function update(id, body) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  const data = sanitize(body);
  await repo.update(id, data);
  return repo.findById(id);
}

module.exports = { parsePagination, buildFilters, list, getById, create, update };
