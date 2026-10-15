exports.up = function (knex) {
  return knex.schema.table('professoras', (table) => {
    table.string('rg', 20);
    table.string('cpf', 14);
  });
};

exports.down = function (knex) {
  return knex.schema.table('professoras', (table) => {
    table.dropColumn('rg');
    table.dropColumn('cpf');
  });
};
