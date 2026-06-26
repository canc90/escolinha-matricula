const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET não definido. Configure no arquivo .env');
  process.exit(1);
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }

  try {
    const user = await userRepo.findById(decoded.id);
    if (!user || user.token_version !== decoded.token_version) {
      return res.status(403).json({ error: 'Token revogado. Faça login novamente.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Erro interno de autenticação.' });
  }
}

async function authenticateTokenRefresh(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = { authenticateToken, authenticateTokenRefresh, JWT_SECRET };
