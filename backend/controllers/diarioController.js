const service = require('../services/diarioService');
const logger = require('../services/loggerService');
const audit = require('../services/auditService');
const resp = require('../services/responseService');

const logAction = logger.logMethod('diario');

async function listDiario(req, res) {
  try {
    const { page, limit, offset } = service.parsePagination(req.query);
    const filters = service.buildFilters(req.query);

    if (req.user.role !== 'admin') {
      filters.professora_id = req.user.professora_id;
    }

    const result = await service.list(filters, page, limit, offset);
    logAction.list(req);
    return res.json({ registros: result.registros, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('List diario error:', error);
    return resp.serverError(res, 'Erro ao listar diário.');
  }
}

async function getDiario(req, res) {
  try {
    const registro = await service.getById(req.params.id);
    if (!registro) return resp.notFound(res, 'Registro não encontrado.');

    if (req.user.role !== 'admin' && registro.professora_id !== req.user.professora_id) {
      return resp.forbidden(res);
    }

    audit.log(req.user.id, req.user.role, 'VIEW', 'diario_classe', registro.id, null, null, req);
    logAction.view(req, registro.id);
    return res.json(registro);
  } catch (error) {
    console.error('Get diario error:', error);
    return resp.serverError(res, 'Erro ao buscar registro.');
  }
}

async function createDiario(req, res) {
  try {
    const body = req.body;
    if (!body.turma_id) return resp.fail(res, 'turma_id é obrigatório.');
    if (!body.data) return resp.fail(res, 'Data é obrigatória.');

    if (req.user.role !== 'admin') {
      body.professora_id = req.user.professora_id;
    }

    const registro = await service.create(body);
    audit.log(req.user.id, req.user.role, 'CREATE', 'diario_classe', registro.id, null, body, req);
    logAction.create(req, registro.id);
    return res.status(201).json(registro);
  } catch (error) {
    console.error('Create diario error:', error);
    return resp.serverError(res, 'Erro ao criar registro.');
  }
}

async function updateDiario(req, res) {
  try {
    const existing = await service.getById(req.params.id);
    if (!existing) return resp.notFound(res, 'Registro não encontrado.');

    if (req.user.role !== 'admin' && existing.professora_id !== req.user.professora_id) {
      return resp.forbidden(res);
    }

    const registro = await service.update(req.params.id, req.body);
    audit.log(req.user.id, req.user.role, 'UPDATE', 'diario_classe', registro.id, existing, registro, req);
    logAction.update(req, registro.id);
    return res.json(registro);
  } catch (error) {
    console.error('Update diario error:', error);
    return resp.serverError(res, 'Erro ao atualizar registro.');
  }
}

module.exports = { listDiario, getDiario, createDiario, updateDiario };
