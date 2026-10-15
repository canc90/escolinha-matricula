const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, refresh } = require('../controllers/authController');
const { authenticateTokenRefresh } = require('../middleware/auth');
const { validateLoginInput } = require('../middleware/validate');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validateLoginInput, login);
router.post('/auth/refresh', authenticateTokenRefresh, refresh);

module.exports = router;
