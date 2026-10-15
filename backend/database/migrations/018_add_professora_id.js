exports.up = function (knex) {
  return knex.schema.alterTable('usuarios', (table) => {
    table.integer('professora_id').unsigned().references('id').inTable('professoras').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('usuarios', (table) => {
    table.dropColumn('professora_id');
  });
};
