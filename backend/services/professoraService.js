const bcrypt = require('bcrypt');
const repo = require('../repositories/professoraRepository');
const userRepo = require('../repositories/userRepository');

const ALLOWED_UPDATE_FIELDS = [
  'nome', 'email', 'telefone', 'especialidade', 'turma', 'turno', 'rg', 'cpf', 'foto', 'foto_documento',
];

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function buildFilters(query) {
  const filters = {};
  if (query.turma) filters.turma = query.turma;
  if (query.turno) filters.turno = query.turno;
  if (query.search) filters.search = query.search;
  return filters;
}

function sanitizeBody(body) {
  const data = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  return data;
}

async function list(filters, page, limit, offset) {
  const [total, professoras] = await Promise.all([
    repo.count(filters),
    repo.list(filters, page, limit, offset),
  ]);
  const totalPages = Math.ceil(total / limit);
  return { professoras, total, page, totalPages };
}

async function getById(id) {
  return repo.findById(id);
}

async function create(data) {
  const sanitized = sanitizeBody(data);
  if (!sanitized.nome || sanitized.nome.trim().length === 0) {
    throw Object.assign(new Error('Nome é obrigatório.'), { status: 400 });
  }
  const [id] = await repo.insert(sanitized);
  return repo.findById(id);
}

async function update(id, body) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  const data = sanitizeBody(body);
  await repo.update(id, data);
  return repo.findById(id);
}

async function remove(id) {
  const existing = await repo.findById(id);
  if (!existing) return null;
  await repo.softDelete(id);
  return true;
}

async function criarLogin(professoraId, usuario, senha) {
  const professora = await repo.findById(professoraId);
  if (!professora) throw Object.assign(new Error('Professora não encontrada.'), { status: 404 });

  const existente = await userRepo.findByProfessoraId(professoraId);
  if (existente) throw Object.assign(new Error('Esta professora já possui login.'), { status: 400 });

  const existenteUsuario = await userRepo.findByUsuario(usuario);
  if (existenteUsuario) throw Object.assign(new Error('Este nome de usuário já está em uso.'), { status: 400 });

  const hash = await bcrypt.hash(senha, 10);
  const { id } = await userRepo.create({
    usuario,
    senha: hash,
    nome: professora.nome,
    role: 'professora',
    professora_id: professoraId,
  });

  return { id, usuario, nome: professora.nome, role: 'professora' };
}

module.exports = { parsePagination, buildFilters, list, getById, create, update, remove, criarLogin };
