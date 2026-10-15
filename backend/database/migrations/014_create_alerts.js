exports.up = function (knex) {
  return knex.schema.createTable('alerts', (table) => {
    table.increments('id');
    table.integer('aluno_id').references('id').inTable('alunos').onDelete('CASCADE');
    table.integer('turma_id').references('id').inTable('turmas').onDelete('CASCADE');
    table.string('type', 50).notNullable().comment('EVASION_RISK | LOW_ATTENDANCE | BEHAVIOR_PATTERN');
    table.string('severity', 20).notNullable().comment('LOW | MEDIUM | HIGH | CRITICAL');
    table.text('message').notNullable();
    table.text('details').comment('JSON com fatores e scores');
    table.boolean('resolved').defaultTo(false);
    table.integer('resolved_by').references('id').inTable('usuarios');
    table.timestamp('resolved_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('aluno_id', 'idx_alerts_aluno');
    table.index('turma_id', 'idx_alerts_turma');
    table.index('type', 'idx_alerts_type');
    table.index('resolved', 'idx_alerts_resolved');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('alerts');
};
