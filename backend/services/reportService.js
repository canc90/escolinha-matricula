const db = require('../database/connection');
const bi = require('./biService');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsvRow(cols, row) {
  return cols.map(c => escapeCsv(row[c])).join(',');
}

async function presencaCSV(filters = {}) {
  const rows = await db('frequencias')
    .join('alunos', 'frequencias.aluno_id', 'alunos.id')
    .join('turmas', 'frequencias.turma_id', 'turmas.id')
    .select(
      'frequencias.data',
      'turmas.nome as turma',
      'alunos.nome as aluno',
      db.raw('CASE WHEN frequencias.presente = 1 THEN \'P\' ELSE \'F\' END as presente')
    )
    .where('turmas.deleted', false)
    .where('alunos.deleted', false)
    .orderBy('frequencias.data', 'asc')
    .orderBy('turmas.nome', 'asc')
    .orderBy('alunos.nome', 'asc')
    .modify(q => {
      if (filters.turma_id) q.where('frequencias.turma_id', filters.turma_id);
      if (filters.data_inicio) q.where('frequencias.data', '>=', filters.data_inicio);
      if (filters.data_fim) q.where('frequencias.data', '<=', filters.data_fim);
    });

  const cols = ['data', 'turma', 'aluno', 'presente'];
  const header = toCsvRow(cols, { data: 'Data', turma: 'Turma', aluno: 'Aluno', presente: 'Presença' });
  const body = rows.map(r => toCsvRow(cols, r));
  return header + '\n' + body.join('\n') + '\n';
}

async function turmasCSV(filters = {}) {
  const ranking = await bi.rankingTurmas(filters);
  const cols = ['turma_nome', 'turno', 'totalRegistros', 'totalPresentes', 'totalFaltas', 'percentualPresenca'];
  const header = toCsvRow(cols, { turma_nome: 'Turma', turno: 'Turno', totalRegistros: 'Total Aulas', totalPresentes: 'Presentes', totalFaltas: 'Faltas', percentualPresenca: '% Presença' });
  const body = ranking.map(r => toCsvRow(cols, r));
  return header + '\n' + body.join('\n') + '\n';
}

async function professorasCSV(filters = {}) {
  const ranking = await bi.rankingProfessoras(filters);
  const cols = ['nome', 'totalRegistros', 'totalDias', 'turmasAtuacao', 'regularidade'];
  const header = toCsvRow(cols, { nome: 'Professora', totalRegistros: 'Total Registros', totalDias: 'Dias Letivos', turmasAtuacao: 'Turmas', regularidade: 'Regularidade' });
  const body = ranking.map(r => toCsvRow(cols, r));
  return header + '\n' + body.join('\n') + '\n';
}

async function relatorioGeral(filters = {}) {
  const [dashboard, rankingTurmas, rankingProf, evolucao, kpis] = await Promise.all([
    bi.dashboardDirecao(filters),
    bi.rankingTurmas(filters),
    bi.rankingProfessoras(filters),
    bi.evolucaoPresenca(filters),
    bi.kpisCompostos(filters),
  ]);

  return {
    geradoEm: new Date().toISOString(),
    dashboard,
    rankingTurmas,
    rankingProfessoras: rankingProf,
    evolucaoPresenca: evolucao,
    kpis,
  };
}

async function relatorioTurma(turmaId, filters = {}) {
  const turma = await db('turmas').where({ id: turmaId, deleted: false }).first();
  if (!turma) return null;

  const alunos = await db('alunos').where({ deleted: false, turma_id: turmaId })
    .orderBy('nome');

  const frequencias = await db('frequencias')
    .join('alunos', 'frequencias.aluno_id', 'alunos.id')
    .where('frequencias.turma_id', turmaId)
    .where('alunos.deleted', false)
    .orderBy('frequencias.data', 'desc')
    .orderBy('alunos.nome')
    .select(
      'frequencias.data',
      'alunos.nome as aluno_nome',
      'frequencias.presente'
    );

  const diario = await db('diario_classe')
    .where({ turma_id: turmaId, deleted: false })
    .orderBy('data', 'desc')
    .select('*');

  const presencaStats = await db('frequencias')
    .where('turma_id', turmaId)
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .first();

  const total = Number(presencaStats?.total || 0);
  const rank = await bi.rankingTurmas({ turma_id: turmaId });
  const evolucao = await bi.evolucaoPresenca({ turma_id: turmaId });

  const frequenciaAluno = {};
  for (const f of frequencias) {
    if (!frequenciaAluno[f.aluno_nome]) frequenciaAluno[f.aluno_nome] = { presente: 0, falta: 0 };
    if (f.presente) frequenciaAluno[f.aluno_nome].presente++;
    else frequenciaAluno[f.aluno_nome].falta++;
  }

  return {
    turma: { id: turma.id, nome: turma.nome, turno: turma.turno, anoLetivo: turma.ano_letivo },
    totalAlunos: alunos.length,
    presenca: {
      totalRegistros: total,
      totalPresentes: Number(presencaStats?.presentes || 0),
      totalFaltas: Number(presencaStats?.faltas || 0),
      percentualPresenca: total > 0 ? Math.round((Number(presencaStats.presentes) / total) * 100) : 0,
    },
    ranking: rank.length > 0 ? rank[0] : null,
    evolucaoPresenca: evolucao,
    totalAulasDiario: diario.length,
    alunos: alunos.map(a => ({
      id: a.id,
      nome: a.nome,
      frequencia: frequenciaAluno[a.nome] || { presente: 0, falta: 0 },
    })),
    diario,
  };
}

async function relatorioProfessora(profId, filters = {}) {
  const prof = await db('professoras').where({ id: profId, deleted: false }).first();
  if (!prof) return null;

  const [diarioRegistros, turmasVinculadas, auditLogs] = await Promise.all([
    db('diario_classe')
      .join('turmas', 'diario_classe.turma_id', 'turmas.id')
      .where('diario_classe.professora_id', profId)
      .where('diario_classe.deleted', false)
      .where('turmas.deleted', false)
      .orderBy('diario_classe.data', 'desc')
      .select(
        'diario_classe.*',
        'turmas.nome as turma_nome'
      ),

    db('turma_professora')
      .join('turmas', 'turma_professora.turma_id', 'turmas.id')
      .where('turma_professora.professora_id', profId)
      .where('turmas.deleted', false)
      .select('turmas.id', 'turmas.nome', 'turma_professora.principal'),

    db('audit_logs')
      .where({ user_id: profId })
      .orWhere(db.raw("JSON_EXTRACT(payload_after, '$.professora_id') = ?", [String(profId)]))
      .orderBy('created_at', 'desc')
      .limit(100)
      .select('*'),
  ]);

  const ranking = await bi.rankingProfessoras({ professora_id: profId });

  return {
    professora: { id: prof.id, nome: prof.nome, email: prof.email },
    turmasVinculadas: turmasVinculadas.map(t => ({ id: t.id, nome: t.nome, principal: !!t.principal })),
    totalAulas: diarioRegistros.length,
    diarioRegistros,
    ranking: ranking.length > 0 ? ranking[0] : null,
    auditLogs: auditLogs.map(a => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id,
      created_at: a.created_at,
    })),
  };
}

module.exports = { presencaCSV, turmasCSV, professorasCSV, relatorioGeral, relatorioTurma, relatorioProfessora, escapeCsv };
