exports.up = function (knex) {
  return knex.schema.alterTable('frequencias', (table) => {
    table.index(['turma_id', 'data'], 'idx_frequencias_turma_data');
    table.index('aluno_id', 'idx_frequencias_aluno');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('frequencias', (table) => {
    table.dropIndex(['turma_id', 'data'], 'idx_frequencias_turma_data');
    table.dropIndex('aluno_id', 'idx_frequencias_aluno');
  });
};
