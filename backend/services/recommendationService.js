const riskEngine = require('./riskEngine');

const RECOMMENDATIONS = {
  CRITICAL: [
    { acao: 'Contato com responsável imediato', prioridade: 1 },
    { acao: 'Plano de recuperação individualizado', prioridade: 2 },
    { acao: 'Monitoramento de frequência diário', prioridade: 3 },
    { acao: 'Encaminhamento para acompanhamento psicopedagógico', prioridade: 4 },
    { acao: 'Reunião com direção escolar', prioridade: 5 },
  ],
  HIGH: [
    { acao: 'Contato com responsável recomendado', prioridade: 1 },
    { acao: 'Reforço em acompanhamento semanal', prioridade: 2 },
    { acao: 'Inserir em atividades de recuperação', prioridade: 3 },
    { acao: 'Alerta ao professor sobre frequência', prioridade: 4 },
  ],
  MEDIUM: [
    { acao: 'Reforço pedagógico preventivo', prioridade: 1 },
    { acao: 'Alerta ao professor para acompanhamento', prioridade: 2 },
    { acao: 'Acompanhamento quinzenal de frequência', prioridade: 3 },
  ],
  LOW: [
    { acao: 'Apenas monitoramento regular', prioridade: 1 },
    { acao: 'Manter registro de frequência atualizado', prioridade: 2 },
  ],
};

async function gerarRecomendacoes(alunoId) {
  const info = await riskEngine.getAlunoTurma(alunoId);
  if (!info) return { aluno_id: alunoId, risk_level: 'LOW', risk_score: 0, recommendations: ['Aluno não encontrado.'] };
  const risco = await riskEngine.calcularRiscoAluno(alunoId, info.turmaId);
  const base = RECOMMENDATIONS[risco.risk_level] || RECOMMENDATIONS.LOW;

  const recommendations = base
    .sort((a, b) => a.prioridade - b.prioridade)
    .map(r => r.acao);

  // Recomendações específicas por fator
  const fatoresEspecificos = [];
  if (risco.factors.includes('baixa_frequencia') || risco.factors.includes('baixa_frequencia_geral')) {
    fatoresEspecificos.push('Estabelecer meta de presença mínima de 75%');
  }
  if (risco.factors.includes('queda_desempenho') || risco.factors.includes('queda_desempenho_registros')) {
    fatoresEspecificos.push('Investigação de causas da queda de frequência');
  }
  if (risco.factors.includes('baixa_interacao')) {
    fatoresEspecificos.push('Incentivar participação em atividades escolares');
  }

  if (risco.comparacaoTurma < -20) {
    fatoresEspecificos.push('Aluno significativamente abaixo da média da turma — priorizar intervenção');
  }

  return {
    aluno_id: alunoId,
    risk_level: risco.risk_level,
    risk_score: risco.risk_score,
    recommendations: [...new Set([...recommendations, ...fatoresEspecificos])],
  };
}

async function gerarRecomendacoesTurma(turmaId) {
  const riscoTurma = await riskEngine.calcularRiscoTurma(turmaId);
  const results = await Promise.all(
    riscoTurma.alunos.map(a => gerarRecomendacoes(a.aluno_id))
  );
  return results;
}

module.exports = { gerarRecomendacoes, gerarRecomendacoesTurma };
