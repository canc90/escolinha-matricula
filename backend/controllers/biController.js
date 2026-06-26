const bi = require('../services/biService');
const resp = require('../services/responseService');

async function dashboardDirecao(req, res) {
  try {
    const { ano_letivo, turma_id, professora_id, data_inicio, data_fim } = req.query;
    const data = await bi.dashboardDirecao({ ano_letivo, turma_id, professora_id, data_inicio, data_fim });
    return res.json(data);
  } catch (error) {
    console.error('Dashboard direcao error:', error);
    return resp.serverError(res);
  }
}

async function evolucaoPresenca(req, res) {
  try {
    const { turma_id, ano_letivo, data_inicio, data_fim } = req.query;
    const data = await bi.evolucaoPresenca({ turma_id, ano_letivo, data_inicio, data_fim });
    return res.json(data);
  } catch (error) {
    console.error('Evolucao presenca error:', error);
    return resp.serverError(res);
  }
}

async function rankingTurmas(req, res) {
  try {
    const { turma_id, ano_letivo, data_inicio, data_fim } = req.query;
    const data = await bi.rankingTurmas({ turma_id, ano_letivo, data_inicio, data_fim });
    return res.json(data);
  } catch (error) {
    console.error('Ranking turmas error:', error);
    return resp.serverError(res);
  }
}

async function rankingProfessoras(req, res) {
  try {
    const { professora_id, ano_letivo, data_inicio, data_fim } = req.query;
    const data = await bi.rankingProfessoras({ professora_id, ano_letivo, data_inicio, data_fim });
    return res.json(data);
  } catch (error) {
    console.error('Ranking professoras error:', error);
    return resp.serverError(res);
  }
}

async function kpisCompostos(req, res) {
  try {
    const { turma_id, ano_letivo, data_inicio, data_fim } = req.query;
    const data = await bi.kpisCompostos({ turma_id, ano_letivo, data_inicio, data_fim });
    return res.json(data);
  } catch (error) {
    console.error('KPIs compostos error:', error);
    return resp.serverError(res);
  }
}

module.exports = { dashboardDirecao, evolucaoPresenca, rankingTurmas, rankingProfessoras, kpisCompostos };
