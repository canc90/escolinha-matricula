exports.up = function (knex) {
  return knex.schema
    .table('alunos', (table) => {
      table.string('foto_documento', 255);
    })
    .then(() => {
      return knex.schema.table('professoras', (table) => {
        table.string('foto_documento', 255);
      });
    });
};

exports.down = function (knex) {
  return knex.schema
    .table('alunos', (table) => {
      table.dropColumn('foto_documento');
    })
    .then(() => {
      return knex.schema.table('professoras', (table) => {
        table.dropColumn('foto_documento');
      });
    });
};
