exports.up = function (knex) {
  return knex.schema.createTable('turma_professora', (table) => {
    table.increments('id').primary();
    table.integer('turma_id').unsigned().notNullable().references('id').inTable('turmas').onDelete('CASCADE');
    table.integer('professora_id').unsigned().notNullable().references('id').inTable('professoras').onDelete('CASCADE');
    table.boolean('principal').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['turma_id', 'professora_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('turma_professora');
};
