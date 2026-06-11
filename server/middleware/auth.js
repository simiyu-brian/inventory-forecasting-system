const jwt = require('jsonwebtoken');

const ROLE_RANK = { operational: 0, analytical: 1, management: 2 };

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid.' });
  }
}

function requireRole(minRole) {
  return (req, res, next) => {
    if ((ROLE_RANK[req.user?.role] ?? -1) >= ROLE_RANK[minRole]) return next();
    return res.status(403).json({ error: 'Insufficient permissions.' });
  };
}

module.exports = { requireAuth, requireRole };
