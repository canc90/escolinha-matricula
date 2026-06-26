const db = require('../database/connection');

const INTERVALO_MS = 60 * 60 * 1000;

async function processarBiSnapshots() {
  try {
    const periodo = new Date().toISOString().slice(0, 7);
    const existente = await db('bi_snapshots').where({ tipo: 'presenca_mensal', periodo }).first();
    if (existente) return;

    const stats = await db('frequencias')
      .select(
        db.raw("strftime('%Y-%m', data) as mes"),
        db.raw('COUNT(*) as total'),
        db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
      )
      .groupBy(db.raw("strftime('%Y-%m', data)"))
      .orderBy('mes', 'asc');

    await db('bi_snapshots').insert({
      tipo: 'presenca_mensal',
      periodo,
      dados: JSON.stringify(stats),
    });

    const ranking = await db('frequencias')
      .join('turmas', 'frequencias.turma_id', 'turmas.id')
      .select(
        'turmas.id',
        'turmas.nome',
        db.raw('COUNT(*) as total'),
        db.raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
      )
      .where('turmas.deleted', false)
      .groupBy('turmas.id', 'turmas.nome')
      .orderBy(db.raw('CAST(SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0)'), 'desc');

    await db('bi_snapshots').insert({
      tipo: 'ranking_turmas',
      periodo,
      dados: JSON.stringify(ranking),
    });
  } catch (err) {
    console.error('Scheduler BI snapshots error:', err.message);
  }
}

async function processarAlertas() {
  try {
    const critical = await db('alunos')
      .where('deleted', false)
      .whereNotNull('turma_id')
      .count('* as total')
      .first();

    const alertas = await db('alerts')
      .where({ type: 'EVASION_RISK', resolved: false })
      .count('* as total')
      .first();

    if (Number(alertas?.total || 0) > 0) return;
  } catch (err) {
    console.error('Scheduler alerts error:', err.message);
  }
}

async function limparCache() {
  try {
    await db('report_cache').where('expires_at', '<', new Date().toISOString()).del();
  } catch (err) {
    console.error('Scheduler cleanup error:', err.message);
  }
}

function iniciar() {
  const rodar = async () => {
    try {
      await limparCache();
      await processarBiSnapshots();
      await processarAlertas();
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  };

  rodar();
  setInterval(rodar, INTERVALO_MS);
  console.log(`Scheduler iniciado (intervalo: ${INTERVALO_MS / 60000} min)`);
}

module.exports = { iniciar, processarBiSnapshots, processarAlertas, limparCache };
