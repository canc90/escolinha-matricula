const db = require('../database/connection');

function findByUsuario(usuario) {
  return db('usuarios').where({ usuario }).first();
}

function findById(id) {
  return db('usuarios').where({ id }).first();
}

function findByProfessoraId(professoraId) {
  return db('usuarios').where({ professora_id: professoraId }).first();
}

function findAll() {
  return db('usuarios').select('id', 'usuario', 'nome', 'role', 'professora_id', 'created_at').orderBy('created_at', 'desc');
}

function create(data) {
  return db('usuarios').insert(data).then(ids => ({ id: ids[0] }));
}

function update(id, data) {
  return db('usuarios').where({ id }).update(data);
}

function remove(id) {
  return db('usuarios').where({ id }).del();
}

function incrementTokenVersion(id) {
  return db('usuarios').where({ id }).increment('token_version', 1);
}

module.exports = { findByUsuario, findById, findByProfessoraId, findAll, create, update, remove, incrementTokenVersion };
