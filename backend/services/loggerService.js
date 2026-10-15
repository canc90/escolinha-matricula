const db = require('../database/connection');

async function log(userId, action, entity, entityId, details) {
  try {
    await db('logs').insert({
      user_id: userId || null,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    console.error('Log error:', err.message);
  }
}

function logMethod(service) {
  return {
    list: (req) => log(req.user?.id, 'list', service, null),
    view: (req, id) => log(req.user?.id, 'view', service, id),
    create: (req, id) => log(req.user?.id, 'create', service, id),
    update: (req, id) => log(req.user?.id, 'update', service, id),
    remove: (req, id) => log(req.user?.id, 'delete', service, id),
    import: (req, count) => log(req.user?.id, 'import', service, null, { count }),
    login: (userId) => log(userId, 'login', 'auth', userId),
  };
}

module.exports = { log, logMethod };
