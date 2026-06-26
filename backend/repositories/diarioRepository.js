const db = require('../database/connection');

function baseQuery() {
  return db('diario_classe').where({ deleted: false });
}

async function list(filters, limit, offset) {
  let q = baseQuery();
  if (filters.turma_id) q = q.where({ turma_id: filters.turma_id });
  if (filters.data) q = q.where({ data: filters.data });
  if (filters.professora_id) q = q.where({ professora_id: filters.professora_id });
  return q.clone().orderBy('data', 'desc').limit(limit).offset(offset);
}

async function count(filters) {
  let q = baseQuery();
  if (filters.turma_id) q = q.where({ turma_id: filters.turma_id });
  if (filters.data) q = q.where({ data: filters.data });
  if (filters.professora_id) q = q.where({ professora_id: filters.professora_id });
  const [{ total }] = await q.clone().count('* as total');
  return total;
}

function findById(id) {
  return baseQuery().where({ id }).first();
}

function insert(data) {
  return db('diario_classe').insert(data);
}

function update(id, data) {
  return db('diario_classe').where({ id }).update({ ...data, updated_at: db.fn.now() });
}

module.exports = { list, count, findById, insert, update };
