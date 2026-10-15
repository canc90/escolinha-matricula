const svc = require('../services/frequenciasService');
const resp = require('../services/responseService');
const logger = require('../services/loggerService');
const audit = require('../services/auditService');

async function getFrequencias(req, res) {
  try {
    const { turma_id, data } = req.query;
    if (!turma_id || !data) return resp.fail(res, 'turma_id e data são obrigatórios.');

    const info = await svc.getTurmaInfo(turma_id);
    if (!info) return resp.notFound(res, 'Turma não encontrada.');

    if (req.user.role !== 'admin') {
      const ok = await svc.verificarVinculo(turma_id, req.user.professora_id);
      if (!ok) return resp.forbidden(res, 'Você não está vinculada a esta turma.');
    }

    const [alunos, existentes] = await Promise.all([
      svc.listarAlunosDaTurma(turma_id),
      svc.getFrequenciasExistentes(turma_id, data),
    ]);

    const presencaMap = {};
    for (const f of existentes) presencaMap[f.aluno_id] = f.presente;

    const registros = alunos.map(a => ({
      aluno_id: a.id,
      nome: a.nome,
      presente: presencaMap[a.id] === undefined ? false : !!presencaMap[a.id],
    }));

    audit.log(req.user.id, req.user.role, 'VIEW', 'frequencia', null, null, { turma_id, data, count: registros.length }, req);
    return res.json({ turma_id: Number(turma_id), data, registros });
  } catch (error) {
    console.error('Get frequencias error:', error);
    return resp.serverError(res, 'Erro ao carregar frequências.');
  }
}

async function salvarFrequencias(req, res) {
  try {
    const { turma_id, data, registros } = req.body;
    if (!turma_id || !data || !registros) {
      return resp.fail(res, 'turma_id, data e registros são obrigatórios.');
    }

    const info = await svc.getTurmaInfo(turma_id);
    if (!info) return resp.notFound(res, 'Turma não encontrada.');

    if (req.user.role !== 'admin') {
      const ok = await svc.verificarVinculo(turma_id, req.user.professora_id);
      if (!ok) return resp.forbidden(res, 'Você não está vinculada a esta turma.');
    }

    const alunoIds = registros.map(r => r.aluno_id);
    const validos = await svc.verificarAlunosTurma(alunoIds, turma_id);
    if (!validos) return resp.fail(res, 'Um ou mais alunos não pertencem a esta turma.');

    await svc.upsertFrequencias(turma_id, data, registros);

    audit.log(req.user.id, req.user.role, 'UPDATE', 'frequencia', null, null, { turma_id, data, registros: registros.length }, req);
    logger.log(req.user?.id, 'update', 'frequencias', null, { turma_id, data, count: registros.length });
    return res.json({ message: 'Frequências salvas com sucesso.', count: registros.length });
  } catch (error) {
    console.error('Salvar frequencias error:', error);
    return resp.serverError(res, 'Erro ao salvar frequências.');
  }
}

async function getHistorico(req, res) {
  try {
    const { turma_id } = req.query;
    if (!turma_id) return resp.fail(res, 'turma_id é obrigatório.');

    if (req.user.role !== 'admin') {
      const ok = await svc.verificarVinculo(turma_id, req.user.professora_id);
      if (!ok) return resp.forbidden(res, 'Você não está vinculada a esta turma.');
    }

    const datas = await svc.getHistoricoDatas(turma_id);
    return res.json({ datas });
  } catch (error) {
    console.error('Get historico error:', error);
    return resp.serverError(res, 'Erro ao carregar histórico.');
  }
}

async function getRelatorio(req, res) {
  try {
    const { turma_id } = req.query;
    if (!turma_id) return resp.fail(res, 'turma_id é obrigatório.');

    const info = await svc.getTurmaInfo(turma_id);
    if (!info) return resp.notFound(res, 'Turma não encontrada.');

    if (req.user.role !== 'admin') {
      const ok = await svc.verificarVinculo(turma_id, req.user.professora_id);
      if (!ok) return resp.forbidden(res, 'Você não está vinculada a esta turma.');
    }

    const [alunos, datas] = await Promise.all([
      svc.listarAlunosDaTurma(turma_id),
      svc.getHistoricoDatas(turma_id),
    ]);

    const registros = await svc.getFrequenciasPorAlunos(turma_id, alunos.map(a => a.id), datas);

    const mapa = {};
    for (const r of registros) {
      if (!mapa[r.aluno_id]) mapa[r.aluno_id] = {};
      mapa[r.aluno_id][r.data] = !!r.presente;
    }

    const alunosRelatorio = alunos.map(a => ({
      aluno_id: a.id,
      nome: a.nome,
      totalPresencas: datas.filter(d => mapa[a.id]?.[d]).length,
      totalFaltas: datas.length - datas.filter(d => mapa[a.id]?.[d]).length,
      percentual: datas.length > 0 ? Math.round((datas.filter(d => mapa[a.id]?.[d]).length / datas.length) * 100) : 0,
      presencas: datas.map(d => mapa[a.id]?.[d] ?? false),
    }));

    return res.json({
      turma_id: Number(turma_id),
      turma_nome: info.nome,
      datas,
      totalAulas: datas.length,
      totalAlunos: alunos.length,
      alunos: alunosRelatorio,
    });
  } catch (error) {
    console.error('Get relatorio error:', error);
    return resp.serverError(res, 'Erro ao carregar relatório.');
  }
}

module.exports = { getFrequencias, salvarFrequencias, getHistorico, getRelatorio };
