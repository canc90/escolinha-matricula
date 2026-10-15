exports.up = function (knex) {
  return knex.schema
    .createTable('bi_snapshots', (table) => {
      table.increments('id');
      table.string('tipo', 50).notNullable().comment('presenca_mensal, ranking_turmas, etc');
      table.string('periodo', 20).notNullable().comment('YYYY-MM');
      table.text('dados').notNullable().comment('JSON com os dados agregados');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tipo', 'periodo'], 'idx_bi_snapshots_tipo_periodo');
    })
    .createTable('report_cache', (table) => {
      table.increments('id');
      table.string('key', 100).notNullable().unique();
      table.text('dados').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('key', 'idx_report_cache_key');
      table.index('expires_at', 'idx_report_cache_expires');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('report_cache')
    .dropTableIfExists('bi_snapshots');
};
