exports.up = function (knex) {
  return knex.schema
    .table('alunos', (table) => {
      table.dropColumn('deleted');
    })
    .table('alunos', (table) => {
      table.boolean('deleted').defaultTo(false);
      table.timestamp('deleted_at');
      table.integer('deleted_by').references('id').inTable('usuarios');
    })
    .then(() => knex.schema.table('turmas', (table) => {
      table.dropColumn('deleted');
    }))
    .then(() => knex.schema.table('turmas', (table) => {
      table.boolean('deleted').defaultTo(false);
      table.timestamp('deleted_at');
      table.integer('deleted_by').references('id').inTable('usuarios');
    }))
    .then(() => knex.schema.table('professoras', (table) => {
      table.dropColumn('deleted');
    }))
    .then(() => knex.schema.table('professoras', (table) => {
      table.boolean('deleted').defaultTo(false);
      table.timestamp('deleted_at');
      table.integer('deleted_by').references('id').inTable('usuarios');
    }))
    .then(() => knex.schema.table('diario_classe', (table) => {
      table.dropColumn('deleted');
    }))
    .then(() => knex.schema.table('diario_classe', (table) => {
      table.boolean('deleted').defaultTo(false);
      table.timestamp('deleted_at');
      table.integer('deleted_by').references('id').inTable('usuarios');
    }));
};

exports.down = function (knex) {
  return Promise.resolve();
};
