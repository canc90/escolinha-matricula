exports.up = function (knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('usuario', 100).notNullable().unique();
    table.string('senha', 255).notNullable();
    table.string('nome', 200).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('usuarios');
};
