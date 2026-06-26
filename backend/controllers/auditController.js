const audit = require('../services/auditService');
const resp = require('../services/responseService');

async function listAudit(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filters = {};
    if (req.query.user_id) filters.user_id = req.query.user_id;
    if (req.query.entity) filters.entity = req.query.entity;
    if (req.query.entity_id) filters.entity_id = req.query.entity_id;
    if (req.query.action) filters.action = req.query.action;
    const result = await audit.list(filters, page, limit);
    return res.json(result);
  } catch (error) {
    console.error('List audit error:', error);
    return resp.serverError(res, 'Erro ao carregar auditoria.');
  }
}

async function listAuditByUser(req, res) {
  req.query.user_id = req.params.id;
  return listAudit(req, res);
}

async function listAuditByEntity(req, res) {
  req.query.entity = req.params.entity;
  req.query.entity_id = req.params.id;
  return listAudit(req, res);
}

module.exports = { listAudit, listAuditByUser, listAuditByEntity };
