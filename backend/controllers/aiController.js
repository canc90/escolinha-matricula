const risk = require('../services/riskEngine');
const rec = require('../services/recommendationService');
const db = require('../database/connection');
const resp = require('../services/responseService');

// ---- RISK ----

async function riscoAluno(req, res) {
  try {
    const alunoId = req.params.id;

    if (req.user.role !== 'admin') {
      const info = await risk.getAlunoTurma(alunoId);
      if (!info) return resp.notFound(res, 'Aluno não encontrado.');
      const turmasVinculadas = await db('turma_professora')
        .where({ professora_id: req.user.professora_id })
        .select('turma_id');
      const ids = turmasVinculadas.map(t => t.turma_id);
      if (!ids.includes(info.turmaId)) return resp.forbidden(res);
    }

    const info = await risk.getAlunoTurma(alunoId);
    if (!info) return resp.notFound(res, 'Aluno não encontrado.');

    const data = await risk.calcularRiscoAluno(alunoId, info.turmaId);
    return res.json(data);
  } catch (error) {
    console.error('Risco aluno error:', error);
    return resp.serverError(res);
  }
}

async function riscoTurma(req, res) {
  try {
    const turmaId = req.params.id;

    if (req.user.role !== 'admin') {
      const vinculo = await db('turma_professora')
        .where({ turma_id: turmaId, professora_id: req.user.professora_id })
        .first();
      if (!vinculo) return resp.forbidden(res);
    }

    const data = await risk.calcularRiscoTurma(turmaId);
    return res.json(data);
  } catch (error) {
    console.error('Risco turma error:', error);
    return resp.serverError(res);
  }
}

async function riscoDashboard(req, res) {
  try {
    if (req.user.role !== 'admin') return resp.forbidden(res);
    const data = await risk.calcularRiscoDashboard(req.query);
    return res.json(data);
  } catch (error) {
    console.error('Risco dashboard error:', error);
    return resp.serverError(res);
  }
}

// ---- RECOMMENDATIONS ----

async function recomendacoesAluno(req, res) {
  try {
    const alunoId = req.params.id;

    if (req.user.role !== 'admin') {
      const info = await risk.getAlunoTurma(alunoId);
      if (!info) return resp.notFound(res, 'Aluno não encontrado.');
      const turmasVinculadas = await db('turma_professora')
        .where({ professora_id: req.user.professora_id })
        .select('turma_id');
      const ids = turmasVinculadas.map(t => t.turma_id);
      if (!ids.includes(info.turmaId)) return resp.forbidden(res);
    }

    const data = await rec.gerarRecomendacoes(alunoId);
    return res.json(data);
  } catch (error) {
    console.error('Recomendacoes aluno error:', error);
    return resp.serverError(res);
  }
}

// ---- ALERTS ----

async function listarAlertas(req, res) {
  try {
    let query = db('alerts')
      .join('alunos', 'alerts.aluno_id', 'alunos.id')
      .leftJoin('turmas', 'alerts.turma_id', 'turmas.id')
      .orderBy('alerts.created_at', 'desc')
      .select('alerts.*', 'alunos.nome as aluno_nome', 'turmas.nome as turma_nome');

    if (req.query.type) query = query.where('alerts.type', req.query.type);
    if (req.query.severity) query = query.where('alerts.severity', req.query.severity);
    if (req.query.resolved === 'true') query = query.where('alerts.resolved', true);
    else if (req.query.resolved === 'false') query = query.where('alerts.resolved', false);

    if (req.user.role !== 'admin') {
      const turmasIds = await db('turma_professora')
        .where({ professora_id: req.user.professora_id })
        .select('turma_id');
      const ids = turmasIds.map(t => t.turma_id);
      if (ids.length > 0) query = query.whereIn('alerts.turma_id', ids);
      else query = query.where('alerts.turma_id', null);
    }

    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const registros = await query.limit(limit);

    return res.json({
      registros: registros.map(r => ({
        ...r,
        details: r.details ? JSON.parse(r.details) : null,
      })),
      total: registros.length,
    });
  } catch (error) {
    console.error('List alerts error:', error);
    return resp.serverError(res);
  }
}

async function resolverAlerta(req, res) {
  try {
    const alerta = await db('alerts').where({ id: req.params.id }).first();
    if (!alerta) return resp.notFound(res, 'Alerta não encontrado.');

    if (req.user.role !== 'admin') {
      const vinculo = await db('turma_professora')
        .where({ turma_id: alerta.turma_id, professora_id: req.user.professora_id })
        .first();
      if (!vinculo) return resp.forbidden(res);
    }

    await db('alerts')
      .where({ id: req.params.id })
      .update({
        resolved: true,
        resolved_by: req.user.id,
        resolved_at: db.fn.now(),
      });

    return res.json({ message: 'Alerta resolvido com sucesso.' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return resp.serverError(res);
  }
}

// ---- GERAR ALERTAS AUTOMATICOS ----

async function gerarAlertasAutomaticos(req, res) {
  try {
    if (req.user.role !== 'admin') return resp.forbidden(res);
    const dashboard = await risk.calcularRiscoDashboard();
    let criados = 0;

    for (const aluno of dashboard.ranking) {
      if (aluno.risk_level === 'LOW') continue;

      const existente = await db('alerts')
        .where({ aluno_id: aluno.aluno_id, type: 'EVASION_RISK', resolved: false })
        .first();
      if (existente) continue;

      const message = `Aluno ${aluno.aluno_nome || 'ID ' + aluno.aluno_id} em risco ${aluno.risk_level} (score: ${aluno.risk_score})`;
      await db('alerts').insert({
        aluno_id: aluno.aluno_id,
        turma_id: aluno.turma_id,
        type: 'EVASION_RISK',
        severity: aluno.risk_level,
        message,
        details: JSON.stringify({
          risk_score: aluno.risk_score,
          factors: aluno.factors,
          scoreDetails: aluno.scoreDetails,
        }),
      });
      criados++;
    }

    return res.json({ message: `${criados} alertas gerados.`, criados });
  } catch (error) {
    console.error('Gerar alerts error:', error);
    return resp.serverError(res);
  }
}

module.exports = { riscoAluno, riscoTurma, riscoDashboard, recomendacoesAluno, listarAlertas, resolverAlerta, gerarAlertasAutomaticos };
