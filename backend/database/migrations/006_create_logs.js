exports.up = function (knex) {
  return knex.schema
    .createTable('logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.string('action', 100).notNullable();
      table.string('entity', 100);
      table.integer('entity_id').unsigned();
      table.text('details');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .alterTable('usuarios', (t) => {
      t.string('role', 50).defaultTo('admin');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('usuarios', (t) => {
      t.dropColumn('role');
    })
    .dropTableIfExists('logs');
};
