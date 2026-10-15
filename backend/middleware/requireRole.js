function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária.', code: 'UNAUTHORIZED' });
    }

    const userRole = req.user.role || 'admin';

    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Acesso proibido para esta função.', code: 'FORBIDDEN' });
    }

    next();
  };
}

module.exports = { requireRole };
