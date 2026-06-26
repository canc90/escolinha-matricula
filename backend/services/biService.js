const db = require('../database/connection');

function buildPeriodFilter(query, alias, filters) {
  if (filters.ano_letivo) {
    query.where(db.raw(`strftime('%Y', ${alias})`), String(filters.ano_letivo));
  }
  if (filters.data_inicio) {
    query.where(alias, '>=', filters.data_inicio);
  }
  if (filters.data_fim) {
    query.where(alias, '<=', filters.data_fim);
  }
}

async function dashboardDirecao(filters = {}) {
  const [presencaStats, diarioStats, totalAlunos, totalTurmas, totalProfessoras] = await Promise.all([
    db('frequencias')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
        db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
      )
      .modify(q => {
        if (filters.turma_id) q.where('turma_id', filters.turma_id);
        buildPeriodFilter(q, 'data', filters);
      })
      .first(),

    db('diario_classe')
      .where('deleted', false)
      .modify(q => {
        if (filters.turma_id) q.where('turma_id', filters.turma_id);
        if (filters.professora_id) q.where('professora_id', filters.professora_id);
        buildPeriodFilter(q, 'data', filters);
      })
      .count('* as total')
      .select(db.raw('COUNT(DISTINCT data) as dias'))
      .first(),

    db('alunos').where('deleted', false).count('* as total').first(),

    db('turmas').where('deleted', false).count('* as total').first(),

    db('professoras').where('deleted', false).count('* as total').first(),
  ]);

  const total = Number(presencaStats?.total || 0);
  const presentes = Number(presencaStats?.presentes || 0);

  return {
    presenca: {
      totalRegistros: total,
      totalPresentes: presentes,
      totalFaltas: Number(presencaStats?.faltas || 0),
      percentualPresenca: total > 0 ? Math.round((presentes / total) * 100) : 0,
    },
    diario: {
      totalRegistros: Number(diarioStats?.total || 0),
      diasLetivos: Number(diarioStats?.dias || 0),
    },
    totais: {
      alunos: Number(totalAlunos?.total || 0),
      turmas: Number(totalTurmas?.total || 0),
      professoras: Number(totalProfessoras?.total || 0),
    },
  };
}

async function evolucaoPresenca(filters = {}) {
  const rows = await db('frequencias')
    .select(
      db.raw("strftime('%Y-%m', data) as mes"),
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .modify(q => {
      if (filters.turma_id) q.where('turma_id', filters.turma_id);
      buildPeriodFilter(q, 'data', filters);
    })
    .groupBy(db.raw("strftime('%Y-%m', data)"))
    .orderBy('mes', 'asc');

  const resultado = rows.map((r, i) => {
    const total = Number(r.total);
    const presentes = Number(r.presentes);
    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
    let variacao = null;
    if (i > 0) {
      const anterior = Number(rows[i - 1].presentes) / Number(rows[i - 1].total) * 100;
      variacao = Math.round((pct - anterior) * 10) / 10;
    }
    return {
      mes: r.mes,
      total,
      presentes,
      faltas: Number(r.faltas),
      percentual: pct,
      variacaoPercentual: variacao,
    };
  });

  return resultado;
}

async function rankingTurmas(filters = {}) {
  const rows = await db('frequencias')
    .join('turmas', 'frequencias.turma_id', 'turmas.id')
    .select(
      'turmas.id',
      'turmas.nome',
      'turmas.turno',
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .where('turmas.deleted', false)
    .modify(q => {
      if (filters.turma_id) q.where('frequencias.turma_id', filters.turma_id);
      buildPeriodFilter(q, 'frequencias.data', filters);
    })
    .groupBy('turmas.id', 'turmas.nome', 'turmas.turno')
    .orderBy(db.raw('CAST(SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)'), 'desc');

  return rows.map(r => {
    const total = Number(r.total);
    const presentes = Number(r.presentes);
    return {
      turma_id: r.id,
      turma_nome: r.nome,
      turno: r.turno,
      totalRegistros: total,
      totalPresentes: presentes,
      totalFaltas: Number(r.faltas),
      percentualPresenca: total > 0 ? Math.round((presentes / total) * 100) : 0,
    };
  });
}

async function rankingProfessoras(filters = {}) {
  const turmasPorProfessora = db('turma_professora')
    .join('turmas', 'turma_professora.turma_id', 'turmas.id')
    .where('turmas.deleted', false)
    .groupBy('turma_professora.professora_id')
    .select(
      'turma_professora.professora_id',
      db.raw('GROUP_CONCAT(turmas.nome, \', \') as turmas_nomes'),
      db.raw('COUNT(*) as total_turmas')
    );

  const rows = await db('diario_classe')
    .join('professoras', 'diario_classe.professora_id', 'professoras.id')
    .where('diario_classe.deleted', false)
    .whereNotNull('diario_classe.professora_id')
    .modify(q => {
      if (filters.professora_id) q.where('diario_classe.professora_id', filters.professora_id);
      buildPeriodFilter(q, 'diario_classe.data', filters);
    })
    .groupBy('diario_classe.professora_id')
    .select(
      'professoras.id',
      'professoras.nome',
      db.raw('COUNT(diario_classe.id) as total_registros'),
      db.raw('COUNT(DISTINCT diario_classe.data) as total_dias'),
      db.raw('COUNT(DISTINCT diario_classe.turma_id) as turmas_atuacao'),
      db.raw('MIN(diario_classe.data) as primeiro_registro'),
      db.raw('MAX(diario_classe.data) as ultimo_registro')
    )
    .orderBy('total_registros', 'desc');

  const turmaMap = {};
  const turmasData = await turmasPorProfessora;
  for (const t of turmasData) {
    turmaMap[t.professora_id] = { turmas: t.turmas_nomes, totalTurmas: t.total_turmas };
  }

  return rows.map(r => {
    const info = turmaMap[r.id] || {};
    const totalDias = Number(r.total_dias);
    const totalRegistros = Number(r.total_registros);
    const regularidade = totalDias > 0
      ? Math.round((totalRegistros / totalDias) * 100) / 100
      : 0;

    return {
      professora_id: r.id,
      nome: r.nome,
      totalRegistros,
      totalDias,
      turmasAtuacao: Number(r.turmas_atuacao),
      turmasVinculadas: info.turmas || '',
      totalTurmasVinculadas: info.totalTurmas || 0,
      regularidade,
      primeiroRegistro: r.primeiro_registro,
      ultimoRegistro: r.ultimo_registro,
    };
  });
}

async function kpisCompostos(filters = {}) {
  const evolucao = await evolucaoPresenca(filters);

  const desvios = await db('frequencias')
    .join('turmas', 'frequencias.turma_id', 'turmas.id')
    .select(
      'turmas.id',
      'turmas.nome',
      db.raw('AVG(CASE WHEN presente = 1 THEN 100.0 ELSE 0 END) as media'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('COUNT(*) as total')
    )
    .where('turmas.deleted', false)
    .modify(q => {
      buildPeriodFilter(q, 'frequencias.data', filters);
    })
    .groupBy('turmas.id', 'turmas.nome');

  const desvioPorTurma = desvios.map(d => {
    const total = Number(d.total);
    const media = total > 0 ? Number(d.presentes) / total : 0;
    return {
      turma_id: d.id,
      turma_nome: d.nome,
      mediaPercentual: Math.round(media * 100),
      totalRegistros: total,
    };
  });

  const mediaGeral = desvioPorTurma.length > 0
    ? Math.round(desvioPorTurma.reduce((a, b) => a + b.mediaPercentual, 0) / desvioPorTurma.length)
    : 0;

  const tendencia = evolucao.length >= 2
    ? (evolucao[evolucao.length - 1].percentual - evolucao[0].percentual)
    : 0;

  return {
    mediaGeralPresenca: mediaGeral,
    desvioPorTurma,
    tendenciaGeral: Math.round(tendencia * 10) / 10,
    totalMeses: evolucao.length,
    maiorPresenca: desvioPorTurma.reduce((a, b) => a.mediaPercentual > b.mediaPercentual ? a : b, desvioPorTurma[0] || {}),
    menorPresenca: desvioPorTurma.reduce((a, b) => a.mediaPercentual < b.mediaPercentual ? a : b, desvioPorTurma[0] || {}),
    variacaoMensal: evolucao.filter(e => e.variacaoPercentual !== null).length,
  };
}

module.exports = { dashboardDirecao, evolucaoPresenca, rankingTurmas, rankingProfessoras, kpisCompostos };
