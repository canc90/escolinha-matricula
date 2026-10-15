const audit = require('../services/auditService');

function auditMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (req.user && req.method !== 'GET') {
      const action = {
        POST: 'CREATE',
        PUT: 'UPDATE',
        PATCH: 'UPDATE',
        DELETE: 'DELETE',
      }[req.method] || req.method;

      const entity = req.baseUrl?.replace('/api/', '') || req.path?.split('/')[2];
      const entityId = req.params?.id || body?.id || null;

      audit.log(
        req.user.id,
        req.user.role,
        action,
        entity,
        entityId,
        null,
        body && typeof body === 'object' ? body : null,
        req
      );
    }
    return originalJson(body);
  };
  next();
}

module.exports = { auditMiddleware };
