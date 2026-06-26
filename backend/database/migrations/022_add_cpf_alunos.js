exports.up = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.string('cpf_aluno', 14);
    table.string('cpf_pai', 14);
    table.string('cpf_mae', 14);
  });
};

exports.down = function (knex) {
  return knex.schema.table('alunos', (table) => {
    table.dropColumn('cpf_aluno');
    table.dropColumn('cpf_pai');
    table.dropColumn('cpf_mae');
  });
};
