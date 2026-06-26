const db = require('../database/connection');

function captureReq(req) {
  return {
    ip_address: req.ip || req.connection?.remoteAddress || null,
    user_agent: req.headers?.['user-agent'] || null,
  };
}

async function log(userId, role, action, entity, entityId, payloadBefore, payloadAfter, req) {
  try {
    const meta = req ? captureReq(req) : {};
    await db('audit_logs').insert({
      user_id: userId || null,
      role: role || null,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      payload_before: payloadBefore ? JSON.stringify(payloadBefore) : null,
      payload_after: payloadAfter ? JSON.stringify(payloadAfter) : null,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

async function list(filters = {}, page = 1, limit = 50) {
  let query = db('audit_logs').orderBy('created_at', 'desc');
  const countQuery = db('audit_logs');

  if (filters.user_id) {
    query = query.where({ user_id: filters.user_id });
    countQuery.where({ user_id: filters.user_id });
  }
  if (filters.entity) {
    query = query.where({ entity: filters.entity });
    countQuery.where({ entity: filters.entity });
  }
  if (filters.entity_id) {
    query = query.where({ entity_id: filters.entity_id });
    countQuery.where({ entity_id: filters.entity_id });
  }
  if (filters.action) {
    query = query.where({ action: filters.action });
    countQuery.where({ action: filters.action });
  }

  const total = (await countQuery.count('* as total').first())?.total || 0;
  const offset = (page - 1) * limit;
  const registros = await query.limit(limit).offset(offset);

  return {
    registros: registros.map(r => ({
      ...r,
      payload_before: r.payload_before ? JSON.parse(r.payload_before) : null,
      payload_after: r.payload_after ? JSON.parse(r.payload_after) : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { log, list };
