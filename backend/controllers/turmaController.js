const service = require('../services/turmaService');
const audit = require('../services/auditService');
const logger = require('../services/loggerService');
const resp = require('../services/responseService');

const logAction = logger.logMethod('turma');

async function listTurmas(req, res) {
  try {
    const { page, limit, offset } = service.parsePagination(req.query);
    const filters = service.buildFilters(req.query);
    const result = await service.list(filters, page, limit, offset);
    logAction.list(req);
    return res.json({ turmas: result.turmas, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('List turmas error:', error);
    return resp.serverError(res, 'Erro ao listar turmas.');
  }
}

async function getTurma(req, res) {
  try {
    const turma = await service.getById(req.params.id);
    if (!turma) return resp.notFound(res, 'Turma não encontrada.');
    audit.log(req.user.id, req.user.role, 'VIEW', 'turma', turma.id, null, null, req);
    logAction.view(req, turma.id);
    return res.json(turma);
  } catch (error) {
    console.error('Get turma error:', error);
    return resp.serverError(res, 'Erro ao buscar turma.');
  }
}

async function createTurma(req, res) {
  try {
    const turma = await service.create(req.body);
    audit.log(req.user.id, req.user.role, 'CREATE', 'turma', turma.id, null, turma, req);
    logAction.create(req, turma.id);
    return res.status(201).json(turma);
  } catch (error) {
    console.error('Create turma error:', error);
    return resp.serverError(res, 'Erro ao criar turma.');
  }
}

async function updateTurma(req, res) {
  try {
    const existing = await service.getById(req.params.id);
    if (!existing) return resp.notFound(res, 'Turma não encontrada.');

    const turma = await service.update(req.params.id, req.body);
    audit.log(req.user.id, req.user.role, 'UPDATE', 'turma', turma.id, existing, turma, req);
    logAction.update(req, turma.id);
    return res.json(turma);
  } catch (error) {
    console.error('Update turma error:', error);
    return resp.serverError(res, 'Erro ao atualizar turma.');
  }
}

async function deleteTurma(req, res) {
  try {
    const existing = await service.getById(req.params.id);
    if (!existing) return resp.notFound(res, 'Turma não encontrada.');

    const result = await service.remove(req.params.id);
    audit.log(req.user.id, req.user.role, 'DELETE', 'turma', req.params.id, existing, null, req);
    logAction.remove(req, req.params.id);
    return res.json({ message: 'Turma removida com sucesso.' });
  } catch (error) {
    console.error('Delete turma error:', error);
    return resp.serverError(res, 'Erro ao remover turma.');
  }
}

async function listProfessorasDaTurma(req, res) {
  try {
    const turma = await service.getById(req.params.id);
    if (!turma) return resp.notFound(res, 'Turma não encontrada.');
    const vinculos = await service.listProfessorasVinculadas(req.params.id);
    return res.json({ professoras: vinculos });
  } catch (error) {
    console.error('List professoras da turma error:', error);
    return resp.serverError(res, 'Erro ao listar vínculos.');
  }
}

async function vincularProfessora(req, res) {
  try {
    const { professora_id, principal } = req.body;
    if (!professora_id) return resp.fail(res, 'professora_id é obrigatório.');

    const turma = await service.getById(req.params.id);
    if (!turma) return resp.notFound(res, 'Turma não encontrada.');

    await service.vincularProfessora(req.params.id, professora_id, principal);
    audit.log(req.user.id, req.user.role, 'CREATE', 'turma_professora', null, null, { turma_id: req.params.id, professora_id }, req);
    logger.log(req.user?.id, 'create', 'turma_professora', null, { turma_id: req.params.id, professora_id });
    return res.status(201).json({ message: 'Professora vinculada com sucesso.' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return resp.fail(res, 'Esta professora já está vinculada a esta turma.');
    }
    console.error('Vincular professora error:', error);
    return resp.serverError(res, 'Erro ao vincular professora.');
  }
}

  async function listarTurmasDaProfessora(req, res) {
    try {
      const professoraId = parseInt(req.params.id, 10);
      const turmas = await service.listarTurmasDaProfessora(professoraId);
      return res.json({ turmas });
    } catch (error) {
      console.error('List turmas da professora error:', error);
      return resp.serverError(res, 'Erro ao listar turmas da professora.');
    }
  }

  async function desvincularProfessora(req, res) {
  try {
    const turma = await service.getById(req.params.id);
    if (!turma) return resp.notFound(res, 'Turma não encontrada.');

    await service.desvincularProfessora(req.params.id, req.params.professoraId);
    audit.log(req.user.id, req.user.role, 'DELETE', 'turma_professora', null, { turma_id: req.params.id, professora_id: req.params.professoraId }, null, req);
    logger.log(req.user?.id, 'delete', 'turma_professora', null, { turma_id: req.params.id, professora_id: req.params.professoraId });
    return res.json({ message: 'Professora desvinculada com sucesso.' });
  } catch (error) {
    console.error('Desvincular professora error:', error);
    return resp.serverError(res, 'Erro ao desvincular professora.');
  }
}

module.exports = { listTurmas, getTurma, createTurma, updateTurma, deleteTurma, listProfessorasDaTurma, listarTurmasDaProfessora, vincularProfessora, desvincularProfessora };
