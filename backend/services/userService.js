const bcrypt = require('bcrypt');
const userRepo = require('../repositories/userRepository');
const logger = require('./loggerService');

const ROLES_VALIDOS = ['admin', 'direcao', 'pedagogico', 'professor', 'professora'];

async function listarUsuarios() {
  return userRepo.findAll();
}

async function obterUsuario(id) {
  const user = await userRepo.findById(id);
  if (!user) return null;
  const { senha, token_version, ...safe } = user;
  return safe;
}

async function criarUsuario(data, actorId) {
  const { usuario, senha, nome, role, professora_id } = data;

  if (!usuario || !senha || !nome) {
    throw new Error('Usuário, senha e nome são obrigatórios.');
  }

  const existente = await userRepo.findByUsuario(usuario);
  if (existente) {
    throw new Error('Usuário já existe.');
  }

  if (role && !ROLES_VALIDOS.includes(role)) {
    throw new Error('Role inválida.');
  }

  const hash = await bcrypt.hash(senha, 10);
  const user = await userRepo.create({
    usuario,
    senha: hash,
    nome,
    role: role || 'professor',
    professora_id: professora_id || null,
  });

  logger.log(actorId, 'create', 'user', user.id, { usuario, role: role || 'professor' });
  const { senha: _, token_version, ...safe } = await userRepo.findById(user.id);
  return safe;
}

async function atualizarUsuario(id, data, actorId) {
  const user = await userRepo.findById(id);
  if (!user) return null;

  const { senha, role, professora_id, ...rest } = data;
  const updates = { ...rest };

  if (role) {
    if (!ROLES_VALIDOS.includes(role)) {
      throw new Error('Role inválida.');
    }
    updates.role = role;
  }

  if (professora_id !== undefined) {
    updates.professora_id = professora_id;
  }

  if (senha) {
    updates.senha = await bcrypt.hash(senha, 10);
  }

  if (Object.keys(updates).length > 0) {
    await userRepo.update(id, updates);
    logger.log(actorId, 'update', 'user', id, updates);
  }

  const { senha: _, token_version, ...safe } = await userRepo.findById(id);
  return safe;
}

async function excluirUsuario(id, actorId) {
  const user = await userRepo.findById(id);
  if (!user) return false;

  if (user.id === actorId) {
    throw new Error('Não pode excluir a si mesmo.');
  }

  await userRepo.remove(id);
  logger.log(actorId, 'delete', 'user', id);
  return true;
}

module.exports = { listarUsuarios, obterUsuario, criarUsuario, atualizarUsuario, excluirUsuario, ROLES_VALIDOS };