const db = require('../database/connection');

async function verificarVinculo(turmaId, professoraId) {
  if (!professoraId) return true;
  const vinculo = await db('turma_professora')
    .where({ turma_id: turmaId, professora_id: professoraId })
    .first();
  return !!vinculo;
}

async function getTurmaInfo(turmaId) {
  const turma = await db('turmas').where({ id: turmaId, deleted: false }).select('id', 'nome').first();
  if (!turma) return null;
  return { id: turma.id, nome: turma.nome };
}

async function listarAlunosDaTurma(turmaId) {
  if (!turmaId) return [];
  return db('alunos')
    .where({ turma_id: turmaId, deleted: false })
    .orderBy('nome', 'asc')
    .select('id', 'nome');
}

async function getFrequenciasExistentes(turmaId, data) {
  return db('frequencias')
    .where({ turma_id: turmaId, data })
    .select('aluno_id', 'presente');
}

async function upsertFrequencias(turmaId, data, registros) {
  return db.transaction(async (trx) => {
    for (const r of registros) {
      await trx('frequencias')
        .insert({ turma_id: turmaId, aluno_id: r.aluno_id, data, presente: !!r.presente })
        .onConflict(['turma_id', 'aluno_id', 'data'])
        .merge({ presente: !!r.presente });
    }
  });
}

async function getHistoricoDatas(turmaId) {
  return db('frequencias')
    .where({ turma_id: turmaId })
    .distinct('data')
    .orderBy('data', 'desc')
    .pluck('data');
}

async function verificarAlunosTurma(alunoIds, turmaId) {
  if (!turmaId || alunoIds.length === 0) return false;
  const count = await db('alunos')
    .whereIn('id', alunoIds)
    .where({ turma_id: turmaId, deleted: false })
    .count('* as total');
  return Number(count[0]?.total || 0) === alunoIds.length;
}

async function getFrequenciasPorAlunos(turmaId, alunoIds, datas) {
  if (datas.length === 0 || alunoIds.length === 0) return [];
  return db('frequencias')
    .where({ turma_id: turmaId })
    .whereIn('aluno_id', alunoIds)
    .whereIn('data', datas)
    .select('aluno_id', 'data', 'presente');
}

module.exports = {
  verificarVinculo,
  getTurmaInfo,
  listarAlunosDaTurma,
  getFrequenciasExistentes,
  upsertFrequencias,
  getHistoricoDatas,
  verificarAlunosTurma,
  getFrequenciasPorAlunos,
};
