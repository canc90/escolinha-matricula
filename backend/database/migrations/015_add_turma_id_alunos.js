exports.up = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.integer('turma_id').references('id').inTable('turmas').onDelete('SET NULL');
    table.index('turma_id', 'idx_alunos_turma_id');
  }).then(async function () {
    await knex('alunos').where('turma', '1').update({ turma_id: 5 });
    await knex('alunos').where('turma', '2').update({ turma_id: 6 });
    await knex('alunos').where('turma', '3').update({ turma_id: 7 });
    await knex('alunos').where('turma', '4').update({ turma_id: 8 });
  });
};

exports.down = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.dropIndex('turma_id', 'idx_alunos_turma_id');
    table.dropColumn('turma_id');
  });
};
