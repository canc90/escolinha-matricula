const db = require('../database/connection');

async function presencaGeral() {
  const stats = await db('frequencias')
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .first();
  const total = Number(stats?.total || 0);
  return {
    totalRegistros: total,
    totalPresentes: Number(stats?.presentes || 0),
    totalFaltas: Number(stats?.faltas || 0),
    percentualPresenca: total > 0 ? Math.round((Number(stats.presentes) / total) * 100) : 0,
  };
}

async function presencaPorTurma() {
  const rows = await db('frequencias')
    .join('turmas', 'frequencias.turma_id', 'turmas.id')
    .select(
      'turmas.id',
      'turmas.nome',
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .where('turmas.deleted', false)
    .groupBy('turmas.id', 'turmas.nome')
    .orderBy('turmas.nome');

  return rows.map(r => {
    const total = Number(r.total);
    return {
      turma_id: r.id,
      turma_nome: r.nome,
      totalRegistros: total,
      totalPresentes: Number(r.presentes),
      totalFaltas: Number(r.faltas),
      percentualPresenca: total > 0 ? Math.round((Number(r.presentes) / total) * 100) : 0,
    };
  });
}

async function atividadeProfessoras(limit = 5) {
  const rows = await db('diario_classe')
    .join('professoras', 'diario_classe.professora_id', 'professoras.id')
    .select(
      'professoras.id',
      'professoras.nome',
      db.raw('COUNT(diario_classe.id) as total_registros'),
      db.raw('COUNT(DISTINCT diario_classe.data) as total_dias')
    )
    .where('diario_classe.deleted', false)
    .whereNotNull('diario_classe.professora_id')
    .groupBy('professoras.id', 'professoras.nome')
    .orderBy('total_registros', 'desc')
    .limit(limit);

  return rows.map(r => ({
    professora_id: r.id,
    nome: r.nome,
    totalRegistros: Number(r.total_registros),
    totalDias: Number(r.total_dias),
  }));
}

async function diarioResumo() {
  const stats = await db('diario_classe')
    .select(
      db.raw('COUNT(*) as total_registros'),
      db.raw('COUNT(DISTINCT data) as total_dias'),
      db.raw('COUNT(DISTINCT turma_id) as total_turmas'),
      db.raw('COUNT(DISTINCT professora_id) as total_professoras')
    )
    .where('deleted', false)
    .first();

  return {
    totalRegistros: Number(stats?.total_registros || 0),
    totalDias: Number(stats?.total_dias || 0),
    totalTurmas: Number(stats?.total_turmas || 0),
    totalProfessoras: Number(stats?.total_professoras || 0),
  };
}

async function evolucaoSemanal() {
  const rows = await db('frequencias')
    .select(
      db.raw("strftime('%Y-%W', data) as semana"),
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
    )
    .groupBy(db.raw("strftime('%Y-%W', data)"))
    .orderBy('semana', 'asc')
    .limit(12);

  return rows.map(r => ({
    semana: r.semana,
    total: Number(r.total),
    presentes: Number(r.presentes),
    percentual: Number(r.total) > 0 ? Math.round((Number(r.presentes) / Number(r.total)) * 100) : 0,
  }));
}

module.exports = { presencaGeral, presencaPorTurma, atividadeProfessoras, diarioResumo, evolucaoSemanal };
