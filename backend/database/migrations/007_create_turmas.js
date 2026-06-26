exports.up = function (knex) {
  return knex.schema.createTable('turmas', (table) => {
    table.increments('id').primary();
    table.string('nome', 50).notNullable();
    table.string('turno', 50);
    table.string('ano_letivo', 10);
    table.boolean('deleted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('turmas');
};
