exports.up = function (knex) {
  return knex.schema.createTable('professoras', (table) => {
    table.increments('id').primary();
    table.string('nome', 255).notNullable();
    table.string('email', 254);
    table.string('telefone', 50);
    table.string('especialidade', 255);
    table.string('turma', 50);
    table.string('turno', 50);
    table.boolean('deleted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('professoras');
};
