exports.up = function (knex) {
  return knex.schema.createTable('frequencias', (table) => {
    table.increments('id').primary();
    table.integer('turma_id').unsigned().notNullable().references('id').inTable('turmas').onDelete('CASCADE');
    table.integer('aluno_id').unsigned().notNullable().references('id').inTable('alunos').onDelete('CASCADE');
    table.date('data').notNullable();
    table.boolean('presente').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['turma_id', 'aluno_id', 'data']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('frequencias');
};
