const service = require('../services/professoraService');
const logger = require('../services/loggerService');
const resp = require('../services/responseService');

const logAction = logger.logMethod('professora');

async function listProfessoras(req, res) {
  try {
    const { page, limit, offset } = service.parsePagination(req.query);
    const filters = service.buildFilters(req.query);
    const result = await service.list(filters, page, limit, offset);
    logAction.list(req);
    return res.json({ professoras: result.professoras, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('List professoras error:', error);
    return resp.serverError(res, 'Erro ao listar professoras.');
  }
}

async function getProfessora(req, res) {
  try {
    const professora = await service.getById(req.params.id);
    if (!professora) return resp.notFound(res, 'Professora não encontrada.');
    logAction.view(req, professora.id);
    return res.json(professora);
  } catch (error) {
    console.error('Get professora error:', error);
    return resp.serverError(res, 'Erro ao buscar professora.');
  }
}

async function createProfessora(req, res) {
  try {
    const professora = await service.create(req.body);
    logAction.create(req, professora.id);
    return res.status(201).json(professora);
  } catch (error) {
    if (error.status === 400) return resp.fail(res, error.message);
    console.error('Create professora error:', error);
    return resp.serverError(res, 'Erro ao criar professora.');
  }
}

async function updateProfessora(req, res) {
  try {
    const professora = await service.update(req.params.id, req.body);
    if (!professora) return resp.notFound(res, 'Professora não encontrada.');
    logAction.update(req, professora.id);
    return res.json(professora);
  } catch (error) {
    console.error('Update professora error:', error);
    return resp.serverError(res, 'Erro ao atualizar professora.');
  }
}

async function deleteProfessora(req, res) {
  try {
    const result = await service.remove(req.params.id);
    if (!result) return resp.notFound(res, 'Professora não encontrada.');
    logAction.remove(req, req.params.id);
    return res.json({ message: 'Professora removida com sucesso.' });
  } catch (error) {
    console.error('Delete professora error:', error);
    return resp.serverError(res, 'Erro ao remover professora.');
  }
}

async function criarLoginProfessora(req, res) {
  try {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) {
      return resp.fail(res, 'Usuário e senha são obrigatórios.');
    }
    if (senha.length < 4) {
      return resp.fail(res, 'Senha deve ter no mínimo 4 caracteres.');
    }
    const result = await service.criarLogin(req.params.id, usuario.trim(), senha);
    logAction.create(req, result.id);
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) return resp.fail(res, error.message, error.status);
    console.error('Criar login professora error:', error);
    return resp.serverError(res, 'Erro ao criar login.');
  }
}

module.exports = { listProfessoras, getProfessora, createProfessora, updateProfessora, deleteProfessora, criarLoginProfessora };
