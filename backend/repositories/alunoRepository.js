const db = require('../database/connection');

function baseQuery() {
  return db('alunos').where({ deleted: false });
}

async function count(filters) {
  let q = baseQuery();
  if (filters.turma) q = q.where({ turma: filters.turma });
  if (filters.turma_id) q = q.where({ turma_id: filters.turma_id });
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where(function () {
      this.where('nome', 'like', `%${e}%`)
        .orWhere('nome_pai', 'like', `%${e}%`)
        .orWhere('nome_mae', 'like', `%${e}%`)
        .orWhere('email_aluno', 'like', `%${e}%`);
    });
  }
  const [{ total }] = await q.clone().count('* as total');
  return total;
}

async function list(filters, page, limit, offset) {
  let q = baseQuery();
  if (filters.turma) q = q.where({ turma: filters.turma });
  if (filters.turma_id) q = q.where({ turma_id: filters.turma_id });
  if (filters.turno) q = q.where({ turno: filters.turno });
  if (filters.search) {
    const e = filters.search.replace(/[%_]/g, '\\$&');
    q = q.where(function () {
      this.where('nome', 'like', `%${e}%`)
        .orWhere('nome_pai', 'like', `%${e}%`)
        .orWhere('nome_mae', 'like', `%${e}%`)
        .orWhere('email_aluno', 'like', `%${e}%`);
    });
  }
  return q.clone().orderBy('nome', 'asc').limit(limit).offset(offset);
}

function findById(id) {
  return baseQuery().where({ id }).first();
}

function insert(data) {
  return db('alunos').insert(data);
}

function update(id, data) {
  return db('alunos').where({ id }).update({ ...data, updated_at: db.fn.now() });
}

function softDelete(id) {
  return db('alunos').where({ id }).update({ deleted: true, updated_at: db.fn.now() });
}

function findByUnique(nome, data_nascimento, nome_mae) {
  const trimmedNome = (nome || '').trim().toLowerCase();
  const trimmedMae = (nome_mae || '').trim().toLowerCase();

  if (!trimmedNome && !trimmedMae) return Promise.resolve(null);

  return baseQuery()
    .where(function () {
      if (trimmedNome) {
        this.whereRaw('LOWER(nome) = ?', [trimmedNome]);
      } else {
        this.whereRaw('1 = 0');
      }
    })
    .andWhere(function () {
      if (data_nascimento) {
        this.where({ data_nascimento });
      } else {
        this.whereRaw('1 = 1');
      }
    })
    .andWhere(function () {
      if (trimmedMae) {
        this.whereRaw('LOWER(nome_mae) = ?', [trimmedMae]);
      } else {
        this.whereRaw('1 = 1');
      }
    })
    .first();
}

module.exports = { count, list, findById, findByUnique, insert, update, softDelete };
