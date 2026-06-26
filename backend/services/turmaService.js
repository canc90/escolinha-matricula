const repo = require('../repositories/turmaRepository');

const ALLOWED_FIELDS = ['nome', 'turno', 'ano_letivo'];

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function buildFilters(query) {
  const filters = {};
  if (query.turno) filters.turno = query.turno;
  if (query.ano_letivo) filters.ano_letivo = query.ano_letivo;
  if (query.search) filters.search = query.search;
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
  const [total, turmas] = await Promise.all([
    repo.count(filters),
    repo.list(filters, limit, offset),
  ]);
  const totalPages = Math.ceil(total / limit);
  return { turmas, total, page, totalPages };
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

async function remove(id) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  await repo.softDelete(id);
  return true;
}

// Vínculo
async function vincularProfessora(turmaId, professoraId, principal) {
  return repo.vincularProfessora(turmaId, professoraId, principal);
}

async function listProfessorasVinculadas(turmaId) {
  return repo.listProfessorasVinculadas(turmaId);
}

async function desvincularProfessora(turmaId, professoraId) {
  return repo.desvincularProfessora(turmaId, professoraId);
}

async function listarTurmasDaProfessora(professoraId) {
  return repo.listarTurmasDaProfessora(professoraId);
}

module.exports = { parsePagination, buildFilters, list, getById, create, update, remove, vincularProfessora, listProfessorasVinculadas, desvincularProfessora, listarTurmasDaProfessora };
