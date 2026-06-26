exports.up = function (knex) {
  return knex.schema.createTable('diario_classe', (table) => {
    table.increments('id').primary();
    table.integer('turma_id').unsigned().notNullable().references('id').inTable('turmas').onDelete('CASCADE');
    table.integer('professora_id').unsigned().references('id').inTable('professoras').onDelete('SET NULL');
    table.date('data').notNullable();
    table.text('conteudo_aula');
    table.text('observacoes');
    table.boolean('deleted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('diario_classe');
};
