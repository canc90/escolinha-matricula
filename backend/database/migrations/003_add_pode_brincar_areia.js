exports.up = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.boolean('pode_brincar_areia').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.dropColumn('pode_brincar_areia');
  });
};
