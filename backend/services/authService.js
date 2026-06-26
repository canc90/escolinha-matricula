const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepository');
const { JWT_SECRET } = require('../middleware/auth');

const TOKEN_EXPIRY = '8h';

async function login(usuario, senha) {
  const user = await userRepo.findByUsuario(usuario);
  if (!user) return null;

  const valida = await bcrypt.compare(senha, user.senha);
  if (!valida) return null;

  const token = jwt.sign(
    { id: user.id, usuario: user.usuario, nome: user.nome, role: user.role || 'admin', professora_id: user.professora_id, token_version: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: { id: user.id, usuario: user.usuario, nome: user.nome, role: user.role || 'admin', professora_id: user.professora_id },
  };
}

async function refresh(userId) {
  const user = await userRepo.findById(userId);
  if (!user) return null;

  await userRepo.incrementTokenVersion(userId);
  const updated = await userRepo.findById(userId);

  const token = jwt.sign(
    { id: updated.id, usuario: updated.usuario, nome: updated.nome, role: updated.role || 'admin', professora_id: updated.professora_id, token_version: updated.token_version },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return { token };
}

module.exports = { login, refresh };
