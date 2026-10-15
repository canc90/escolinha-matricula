const db = require('../database/connection');

const RISK_WEIGHTS = {
  RECENT_ABSENCES: 0.40,
  OVERALL_ATTENDANCE: 0.30,
  TREND: 0.20,
  INCONSISTENCY: 0.10,
};

const DAYS_RECENT = [7, 15, 30];

function classifyRisk(score) {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.3) return 'MEDIUM';
  return 'LOW';
}

function getTrend(currentPeriodPct, previousPeriodPct) {
  if (currentPeriodPct === null || previousPeriodPct === null) return 'STABLE';
  const diff = currentPeriodPct - previousPeriodPct;
  if (diff > 5) return 'IMPROVING';
  if (diff < -5) return 'WORSENING';
  return 'STABLE';
}

async function getAlunoTurma(alunoId) {
  const aluno = await db('alunos').where({ id: alunoId, deleted: false }).first();
  if (!aluno) return null;
  return { aluno, turmaId: aluno.turma_id || null, turmaNome: null };
}

async function getFrequenciaStats(alunoId, turmaId) {
  const stats = await db('frequencias')
    .where('aluno_id', alunoId)
    .where('turma_id', turmaId)
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas'),
      db.raw('MAX(data) as ultima_data')
    )
    .first();

  const total = Number(stats?.total || 0);
  const presentes = Number(stats?.presentes || 0);
  return {
    total,
    presentes,
    faltas: Number(stats?.faltas || 0),
    percentual: total > 0 ? (presentes / total) * 100 : 100,
    ultimaData: stats?.ultima_data || null,
  };
}

async function getFaltasRecentes(alunoId, turmaId, days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const since = date.toISOString().split('T')[0];

  const row = await db('frequencias')
    .where('aluno_id', alunoId)
    .where('turma_id', turmaId)
    .where('data', '>=', since)
    .select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'),
      db.raw('SUM(CASE WHEN presente = 0 THEN 1 ELSE 0 END) as faltas')
    )
    .first();

  const total = Number(row?.total || 0);
  const faltas = Number(row?.faltas || 0);
  return {
    total,
    faltas,
    percentualFalta: total > 0 ? (faltas / total) * 100 : 0,
    temAusencia: faltas > 0,
  };
}

async function getEvolucaoMensal(alunoId, turmaId) {
  const rows = await db('frequencias')
    .where('aluno_id', alunoId)
    .where('turma_id', turmaId)
    .select(
      db.raw("strftime('%Y-%m', data) as mes"),
      db.raw('COUNT(*) as total'),
      db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
    )
    .groupBy(db.raw("strftime('%Y-%m', data)"))
    .orderBy('mes', 'asc');

  return rows.map(r => ({
    mes: r.mes,
    total: Number(r.total),
    presentes: Number(r.presentes),
    percentual: Number(r.total) > 0 ? (Number(r.presentes) / Number(r.total)) * 100 : 0,
  }));
}

async function getMediaTurma(turmaId) {
  const row = await db('frequencias')
    .where('turma_id', turmaId)
    .select(
      db.raw('AVG(CASE WHEN presente = 1 THEN 100.0 ELSE 0 END) as media')
    )
    .first();
  return Number(row?.media || 0);
}

async function getInconsistencia(alunoId, turmaId) {
  const aulasTurma = await db('diario_classe')
    .where('turma_id', turmaId)
    .where('deleted', false)
    .count('* as total')
    .first();

  const frequenciasAluno = await db('frequencias')
    .where('aluno_id', alunoId)
    .where('turma_id', turmaId)
    .count('* as total')
    .first();

  const totalAulas = Number(aulasTurma?.total || 0);
  const totalFreq = Number(frequenciasAluno?.total || 0);

  if (totalAulas === 0) return { taxa: 0, totalAulas, totalFreq };
  const taxa = Math.min(1, totalFreq / totalAulas);
  return { taxa, totalAulas, totalFreq };
}

class LRUCache {
  constructor(maxSize = 1000, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, ts: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new LRUCache(1000, 60000);

async function calcularRiscoAluno(alunoId, turmaId) {
  const cacheKey = `risk_${alunoId}_${turmaId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const freq = await getFrequenciaStats(alunoId, turmaId);
  const mediaTurma = await getMediaTurma(turmaId);
  const evolucao = await getEvolucaoMensal(alunoId, turmaId);
  const incons = await getInconsistencia(alunoId, turmaId);

  const scoreDetails = {};
  const factors = [];

  // 1. Faltas recentes (40%)
  let recentScore = 0;
  let recentDetails = [];
  for (const days of DAYS_RECENT) {
    const recents = await getFaltasRecentes(alunoId, turmaId, days);
    if (recents.total > 0) {
      recentScore += recents.percentualFalta / DAYS_RECENT.length;
      if (recents.temAusencia) {
        recentDetails.push(`${recents.faltas} faltas em ${days} dias`);
      }
    }
  }
  recentScore = Math.min(100, recentScore);
  const recentNorm = recentScore / 100;
  scoreDetails.faltasRecentes = {
    peso: RISK_WEIGHTS.RECENT_ABSENCES,
    valor: Math.round(recentScore * 10) / 10,
    contribuicao: Math.round(recentNorm * RISK_WEIGHTS.RECENT_ABSENCES * 100) / 100,
    detalhes: recentDetails.length > 0 ? recentDetails.join('; ') : 'sem faltas recentes',
  };
  if (recentNorm > 0.3) factors.push('baixa_frequencia');

  // 2. Frequência geral (30%)
  const overallFalta = 100 - freq.percentual;
  const overallNorm = Math.min(1, overallFalta / 100);
  scoreDetails.frequenciaGeral = {
    peso: RISK_WEIGHTS.OVERALL_ATTENDANCE,
    valor: Math.round(overallFalta * 10) / 10,
    contribuicao: Math.round(overallNorm * RISK_WEIGHTS.OVERALL_ATTENDANCE * 100) / 100,
    detalhes: `${Math.round(freq.percentual)}% presença geral (turma: ${Math.round(mediaTurma)}%)`,
  };
  if (overallFalta > 30) factors.push('baixa_frequencia_geral');

  // 3. Tendência (20%)
  let trendScore = 0;
  let trendDesc = 'estável';
  let trend = 'STABLE';
  if (evolucao.length >= 2) {
    const current = evolucao[evolucao.length - 1].percentual;
    const previous = evolucao[evolucao.length - 2].percentual;
    const diff = previous - current;
    if (diff > 10) {
      trendScore = Math.min(100, diff);
      trendDesc = `queda de ${Math.round(diff)}%`;
      factors.push('queda_desempenho');
    }
    trend = getTrend(current, previous);
  }
  const trendNorm = Math.min(1, trendScore / 100);
  scoreDetails.tendencia = {
    peso: RISK_WEIGHTS.TREND,
    valor: Math.round(trendScore * 10) / 10,
    contribuicao: Math.round(trendNorm * RISK_WEIGHTS.TREND * 100) / 100,
    detalhes: trendDesc,
  };
  if (trendNorm > 0.3) factors.push('queda_desempenho_registros');

  // 4. Inconsistência (10%)
  const inconsScore = (1 - incons.taxa) * 100;
  const inconsNorm = Math.min(1, inconsScore / 100);
  scoreDetails.inconsistencia = {
    peso: RISK_WEIGHTS.INCONSISTENCY,
    valor: Math.round(inconsScore * 10) / 10,
    contribuicao: Math.round(inconsNorm * RISK_WEIGHTS.INCONSISTENCY * 100) / 100,
    detalhes: `${incons.totalFreq} registros em ${incons.totalAulas} aulas (${Math.round(incons.taxa * 100)}%)`,
  };
  if (inconsNorm > 0.5) factors.push('baixa_interacao');

  // Score final
  const score = Math.min(1, Math.round(
    (recentNorm * RISK_WEIGHTS.RECENT_ABSENCES) +
    (overallNorm * RISK_WEIGHTS.OVERALL_ATTENDANCE) +
    (trendNorm * RISK_WEIGHTS.TREND) +
    (inconsNorm * RISK_WEIGHTS.INCONSISTENCY)
  ) * 100) / 100;

  const riskLevel = classifyRisk(score);

  // Comparação com média da turma
  const comparacaoTurma = freq.total > 0
    ? Math.round((freq.percentual - mediaTurma) * 10) / 10
    : 0;

  const result = {
    aluno_id: alunoId,
    turma_id: turmaId || null,
    risk_score: score,
    risk_level: riskLevel,
    factors: [...new Set(factors)],
    trend,
    scoreDetails,
    comparacaoTurma,
    estatisticas: {
      totalRegistros: freq.total,
      totalPresentes: freq.presentes,
      totalFaltas: freq.faltas,
      percentualPresenca: Math.round(freq.percentual * 10) / 10,
      mediaTurma: Math.round(mediaTurma * 10) / 10,
      mesesAnalisados: evolucao.length,
    },
    explanation: gerarExplicacao(scoreDetails, riskLevel),
  };

  cache.set(cacheKey, result);
  return result;
}

function gerarExplicacao(details, level) {
  const fatores = [];
  const sorted = Object.entries(details)
    .sort((a, b) => b[1].contribuicao - a[1].contribuicao);

  for (const [key, val] of sorted) {
    if (val.contribuicao > 0.01) {
      const pct = Math.round(val.contribuicao / Object.values(details).reduce((s, v) => s + v.contribuicao, 0) * 100);
      const nomes = {
        faltasRecentes: 'Faltas recentes',
        frequenciaGeral: 'Baixa frequência geral',
        tendencia: 'Queda de desempenho',
        inconsistencia: 'Baixa interação registrada',
      };
      fatores.push(`${pct}% ${nomes[key] || key}`);
    }
  }

  return {
    resumo: `Risco ${level} devido a:`,
    fatores,
  };
}

async function calcularRiscoTurma(turmaId) {
  const cacheKey = `risk_turma_${turmaId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const alunos = await db('alunos')
    .where({ deleted: false, turma_id: turmaId })
    .orderBy('nome');

  const results = await Promise.all(
    alunos.map(a => calcularRiscoAluno(a.id, turmaId))
  );

  const sorted = [...results].sort((a, b) => b.risk_score - a.risk_score);

  const aggregados = {
    totalAlunos: alunos.length,
    critical: sorted.filter(r => r.risk_level === 'CRITICAL').length,
    high: sorted.filter(r => r.risk_level === 'HIGH').length,
    medium: sorted.filter(r => r.risk_level === 'MEDIUM').length,
    low: sorted.filter(r => r.risk_level === 'LOW').length,
    mediaRisco: sorted.length > 0
      ? Math.round(sorted.reduce((s, r) => s + r.risk_score, 0) / sorted.length * 100) / 100
      : 0,
  };

  const result = { turma_id: turmaId, aggregados, alunos: sorted };
  cache.set(cacheKey, result);
  return result;
}

async function calcularRiscoDashboard(filters = {}) {
  const turmas = await db('turmas').where('deleted', false);
  let allResults = [];
  const seenAlunos = new Set();

  for (const turma of turmas) {
    if (filters.turma_id && Number(filters.turma_id) !== turma.id) continue;
    const risco = await calcularRiscoTurma(turma.id);
    const alunosUnicos = risco.alunos.filter(a => {
      if (seenAlunos.has(a.aluno_id)) return false;
      seenAlunos.add(a.aluno_id);
      return true;
    });
    allResults.push({
      turma_id: turma.id,
      turma_nome: turma.nome,
      ...risco.aggregados,
      alunos: alunosUnicos,
    });
  }

  // Recalcular agregados por turma com alunos únicos
  for (const t of allResults) {
    const a = t.alunos;
    t.totalAlunos = a.length;
    t.critical = a.filter(r => r.risk_level === 'CRITICAL').length;
    t.high = a.filter(r => r.risk_level === 'HIGH').length;
    t.medium = a.filter(r => r.risk_level === 'MEDIUM').length;
    t.low = a.filter(r => r.risk_level === 'LOW').length;
    t.mediaRisco = a.length > 0 ? Math.round(a.reduce((s, r) => s + r.risk_score, 0) / a.length * 100) / 100 : 0;
  }

  const todosAlunos = allResults.flatMap(t => t.alunos.map(a => ({ ...a, turma_nome: t.turma_nome })));
  const ranking = todosAlunos.sort((a, b) => b.risk_score - a.risk_score);
  const totalCritical = todosAlunos.filter(a => a.risk_level === 'CRITICAL').length;
  const totalHigh = todosAlunos.filter(a => a.risk_level === 'HIGH').length;
  const totalMedium = todosAlunos.filter(a => a.risk_level === 'MEDIUM').length;

  return {
    totalAlunos: todosAlunos.length,
    totalCritical,
    totalHigh,
    totalMedium,
    totalLow: todosAlunos.length - totalCritical - totalHigh - totalMedium,
    mediaRiscoGeral: todosAlunos.length > 0
      ? Math.round(todosAlunos.reduce((s, a) => s + a.risk_score, 0) / todosAlunos.length * 100) / 100
      : 0,
    porTurma: allResults.map(t => ({
      turma_id: t.turma_id,
      turma_nome: t.turma_nome,
      totalAlunos: t.totalAlunos,
      critical: t.critical,
      high: t.high,
      medium: t.medium,
      low: t.low,
      mediaRisco: t.mediaRisco,
    })),
    ranking: ranking.slice(0, 50),
  };
}

module.exports = { calcularRiscoAluno, calcularRiscoTurma, calcularRiscoDashboard, clearCache: () => cache.clear(), getAlunoTurma };
