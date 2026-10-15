const userService = require('../services/userService');
const resp = require('../services/responseService');

async function listar(req, res) {
  try {
    const users = await userService.listarUsuarios();
    return res.json(users);
  } catch (error) {
    console.error('Listar usuários error:', error);
    return resp.serverError(res);
  }
}

async function obter(req, res) {
  try {
    const user = await userService.obterUsuario(req.params.id);
    if (!user) return resp.notFound(res, 'Usuário não encontrado.');
    return res.json(user);
  } catch (error) {
    console.error('Obter usuário error:', error);
    return resp.serverError(res);
  }
}

async function criar(req, res) {
  try {
    const user = await userService.criarUsuario(req.body, req.user.id);
    return res.status(201).json(user);
  } catch (error) {
    if (error.message.includes('obrigatórios') || error.message.includes('já existe') || error.message.includes('inválida')) {
      return resp.fail(res, error.message, 400);
    }
    console.error('Criar usuário error:', error);
    return resp.serverError(res);
  }
}

async function atualizar(req, res) {
  try {
    const user = await userService.atualizarUsuario(req.params.id, req.body, req.user.id);
    if (!user) return resp.notFound(res, 'Usuário não encontrado.');
    return res.json(user);
  } catch (error) {
    if (error.message.includes('inválida') || error.message.includes('si mesmo')) {
      return resp.fail(res, error.message, 400);
    }
    console.error('Atualizar usuário error:', error);
    return resp.serverError(res);
  }
}

async function excluir(req, res) {
  try {
    const ok = await userService.excluirUsuario(req.params.id, req.user.id);
    if (!ok) return resp.notFound(res, 'Usuário não encontrado.');
    return res.json({ success: true });
  } catch (error) {
    if (error.message.includes('si mesmo')) {
      return resp.fail(res, error.message, 400);
    }
    console.error('Excluir usuário error:', error);
    return resp.serverError(res);
  }
}

module.exports = { listar, obter, criar, atualizar, excluir };