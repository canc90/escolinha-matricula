exports.up = function (knex) {
  return knex.schema.alterTable('usuarios', (table) => {
    table.integer('token_version').defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('token_version');
  });
};
