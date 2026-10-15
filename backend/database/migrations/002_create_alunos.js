exports.up = function (knex) {
  return knex.schema.createTable('alunos', (table) => {
    table.increments('id').primary();
    table.integer('id_alu');
    table.string('nome', 255);
    table.date('data_nascimento');
    table.string('genero', 50);
    table.string('endereco_rua', 255);
    table.string('endereco_bairro', 255);
    table.string('endereco_cidade', 255);
    table.string('nome_pai', 255);
    table.string('contato_pai', 100);
    table.string('nome_mae', 255);
    table.string('contato_mae', 100);
    table.string('email_aluno', 255);
    table.boolean('alergia_intolerancia').defaultTo(false);
    table.text('descricao_alergia');
    table.boolean('usa_medicamento').defaultTo(false);
    table.boolean('necessita_atencao_medicamento').defaultTo(false);
    table.boolean('autorizacao_fotos_redes').defaultTo(false);
    table.boolean('autorizacao_passeios').defaultTo(false);
    table.boolean('aniversario_escola').defaultTo(false);
    table.text('observacoes_aniversario_escola');
    table.string('contato_emergencia_nome', 255);
    table.string('contato_emergencia_telefone', 100);
    table.text('responsaveis_retirada');
    table.string('turma', 50);
    table.string('turno', 50);
    table.boolean('deleted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alunos');
};
