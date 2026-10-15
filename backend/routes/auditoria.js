const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { listAudit, listAuditByUser, listAuditByEntity } = require('../controllers/auditController');

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/', listAudit);
router.get('/user/:id', listAuditByUser);
router.get('/entity/:entity/:id', listAuditByEntity);

module.exports = router;
