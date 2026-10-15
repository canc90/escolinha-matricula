exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned();
    table.string('role', 50);
    table.string('action', 50).notNullable();
    table.string('entity', 100);
    table.integer('entity_id').unsigned();
    table.text('payload_before');
    table.text('payload_after');
    table.string('ip_address', 50);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['entity', 'entity_id'], 'idx_audit_entity');
    table.index('user_id', 'idx_audit_user');
    table.index('action', 'idx_audit_action');
    table.index('created_at', 'idx_audit_created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
