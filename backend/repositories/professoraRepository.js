const db = require('../database/connection');

function baseQuery() {
  return db('professoras').where({ deleted: false });
}

async function count(filters) {
  let q = baseQuery();
  if (filters.turma) q = q.where({ turma: filters.turma });
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where(function () {
      this.where('nome', 'like', `%${e}%`)
        .orWhere('email', 'like', `%${e}%`)
        .orWhere('especialidade', 'like', `%${e}%`);
    });
  }
  const [{ total }] = await q.clone().count('* as total');
  return total;
}

async function list(filters, page, limit, offset) {
  let q = baseQuery();
  if (filters.turma) q = q.where({ turma: filters.turma });
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where(function () {
      this.where('nome', 'like', `%${e}%`)
        .orWhere('email', 'like', `%${e}%`)
        .orWhere('especialidade', 'like', `%${e}%`);
    });
  }
  return q.clone().orderBy('nome', 'asc').limit(limit).offset(offset);
}

function findById(id) {
  return baseQuery().where({ id }).first();
}

function insert(data) {
  return db('professoras').insert(data);
}

function update(id, data) {
  return db('professoras').where({ id }).update({ ...data, updated_at: db.fn.now() });
}

function softDelete(id) {
  return db('professoras').where({ id }).update({ deleted: true, updated_at: db.fn.now() });
}

module.exports = { count, list, findById, insert, update, softDelete };
