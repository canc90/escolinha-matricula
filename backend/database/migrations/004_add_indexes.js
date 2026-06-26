exports.up = function (knex) {
  return knex.schema.alterTable('alunos', (table) => {
    table.index('turma', 'idx_alunos_turma');
    table.index('turno', 'idx_alunos_turno');
    table.index('nome', 'idx_alunos_nome');
    table.index('data_nascimento', 'idx_alunos_data_nascimento');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('alunos', (table) => {
    table.dropIndex('turma', 'idx_alunos_turma');
    table.dropIndex('turno', 'idx_alunos_turno');
    table.dropIndex('nome', 'idx_alunos_nome');
    table.dropIndex('data_nascimento', 'idx_alunos_data_nascimento');
  });
};
