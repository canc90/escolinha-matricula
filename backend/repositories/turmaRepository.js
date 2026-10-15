const db = require('../database/connection');

function baseQuery() {
  return db('turmas').where({ deleted: false });
}

async function count(filters) {
  let q = baseQuery();
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.ano_letivo) q = q.where({ ano_letivo: filters.ano_letivo });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where('nome', 'like', `%${e}%`);
  }
  const [{ total }] = await q.clone().count('* as total');
  return total;
}

async function list(filters, limit, offset) {
  let q = baseQuery();
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.ano_letivo) q = q.where({ ano_letivo: filters.ano_letivo });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where('nome', 'like', `%${e}%`);
  }
  return q.clone().orderBy('nome', 'asc').limit(limit).offset(offset);
}

function findById(id) {
  return baseQuery().where({ id }).first();
}

function insert(data) {
  return db('turmas').insert(data);
}

function update(id, data) {
  return db('turmas').where({ id }).update({ ...data, updated_at: db.fn.now() });
}

function softDelete(id) {
  return db('turmas').where({ id }).update({ deleted: true, updated_at: db.fn.now() });
}

// Vínculo professora-turma
function vincularProfessora(turmaId, professoraId, principal) {
  return db('turma_professora').insert({ turma_id: turmaId, professora_id: professoraId, principal: !!principal });
}

function listProfessorasVinculadas(turmaId) {
  return db('turma_professora')
    .join('professoras', 'turma_professora.professora_id', 'professoras.id')
    .where({ 'turma_professora.turma_id': turmaId, 'professoras.deleted': false })
    .select('professoras.id', 'professoras.nome', 'professoras.email', 'turma_professora.principal');
}

function desvincularProfessora(turmaId, professoraId) {
  return db('turma_professora').where({ turma_id: turmaId, professora_id: professoraId }).del();
}

function listarTurmasDaProfessora(professoraId) {
  return db('turma_professora')
    .join('turmas', 'turma_professora.turma_id', 'turmas.id')
    .where({ 'turma_professora.professora_id': professoraId, 'turmas.deleted': false })
    .select('turmas.id', 'turmas.nome', 'turmas.turno', 'turmas.ano_letivo', 'turma_professora.principal')
    .orderBy('turmas.nome', 'asc');
}

module.exports = { count, list, findById, insert, update, softDelete, vincularProfessora, listProfessorasVinculadas, desvincularProfessora, listarTurmasDaProfessora };
