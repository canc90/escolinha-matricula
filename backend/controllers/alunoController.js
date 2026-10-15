const service = require('../services/alunoService');
const logger = require('../services/loggerService');
const resp = require('../services/responseService');

const logAction = logger.logMethod('aluno');

async function listAlunos(req, res) {
  try {
    const { page, limit, offset } = service.parsePagination(req.query);
    const filters = service.buildFilters(req.query);
    const result = await service.list(filters, page, limit, offset);
    logAction.list(req);
    return res.json({ alunos: result.alunos, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('List alunos error:', error);
    return resp.serverError(res, 'Erro ao listar alunos.');
  }
}

async function getAluno(req, res) {
  try {
    const aluno = await service.getById(req.params.id);
    if (!aluno) return resp.notFound(res, 'Aluno não encontrado.');
    logAction.view(req, aluno.id);
    return res.json(aluno);
  } catch (error) {
    console.error('Get aluno error:', error);
    return resp.serverError(res, 'Erro ao buscar aluno.');
  }
}

async function createAluno(req, res) {
  try {
    const aluno = await service.create(req.body);
    logAction.create(req, aluno.id);
    return res.status(201).json(aluno);
  } catch (error) {
    console.error('Create aluno error:', error);
    return resp.serverError(res, 'Erro ao criar aluno.');
  }
}

async function updateAluno(req, res) {
  try {
    const aluno = await service.update(req.params.id, req.body);
    if (!aluno) return resp.notFound(res, 'Aluno não encontrado.');
    logAction.update(req, aluno.id);
    return res.json(aluno);
  } catch (error) {
    console.error('Update aluno error:', error);
    return resp.serverError(res, 'Erro ao atualizar aluno.');
  }
}

async function deleteAluno(req, res) {
  try {
    const result = await service.remove(req.params.id);
    if (!result) return resp.notFound(res, 'Aluno não encontrado.');
    logAction.remove(req, req.params.id);
    return res.json({ message: 'Aluno removido com sucesso.' });
  } catch (error) {
    console.error('Delete aluno error:', error);
    return resp.serverError(res, 'Erro ao remover aluno.');
  }
}

module.exports = { listAlunos, getAluno, createAluno, updateAluno, deleteAluno };
