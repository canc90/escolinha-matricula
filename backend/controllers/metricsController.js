const metrics = require('../services/metricsService');
const resp = require('../services/responseService');
const svc = require('../services/frequenciasService');

async function presencaGeral(req, res) {
  try {
    const data = await metrics.presencaGeral();
    return res.json(data);
  } catch (error) {
    console.error('Presenca geral error:', error);
    return resp.serverError(res);
  }
}

async function presencaPorTurma(req, res) {
  try {
    let data = await metrics.presencaPorTurma();

    if (req.user.role !== 'admin') {
      data = data.filter(t => t.turma_id && t.turma_id);
    }

    return res.json(data);
  } catch (error) {
    console.error('Presenca por turma error:', error);
    return resp.serverError(res);
  }
}

async function atividadeProfessoras(req, res) {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 5);
    const data = await metrics.atividadeProfessoras(limit);
    return res.json(data);
  } catch (error) {
    console.error('Atividade professoras error:', error);
    return resp.serverError(res);
  }
}

async function diarioResumo(req, res) {
  try {
    const data = await metrics.diarioResumo();
    return res.json(data);
  } catch (error) {
    console.error('Diario resumo error:', error);
    return resp.serverError(res);
  }
}

async function evolucaoSemanal(req, res) {
  try {
    const data = await metrics.evolucaoSemanal();
    return res.json(data);
  } catch (error) {
    console.error('Evolucao semanal error:', error);
    return resp.serverError(res);
  }
}

module.exports = { presencaGeral, presencaPorTurma, atividadeProfessoras, diarioResumo, evolucaoSemanal };
