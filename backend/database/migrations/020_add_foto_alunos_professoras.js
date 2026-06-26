exports.up = function (knex) {
  return knex.schema
    .table('alunos', (table) => {
      table.string('foto', 255);
    })
    .then(() => {
      return knex.schema.table('professoras', (table) => {
        table.string('foto', 255);
      });
    });
};

exports.down = function (knex) {
  return knex.schema
    .table('alunos', (table) => {
      table.dropColumn('foto');
    })
    .then(() => {
      return knex.schema.table('professoras', (table) => {
        table.dropColumn('foto');
      });
    });
};
