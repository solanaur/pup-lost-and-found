const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getUserByUsername, getUserById, userPublic } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authOptional(req, _res, next) {
  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  req.user = token ? verifyToken(token) : null;
  next();
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function login(username, password) {
  const row = getUserByUsername(username);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return null;
  }
  if (row.approval_status !== 'approved') {
    return { error: 'pending', message: 'Account pending admin approval' };
  }
  row.login_count = (row.login_count || 0) + 1;
  row.last_login_at = new Date().toISOString();
  const { persist } = require('./db');
  persist();
  return row;
}

function meFromToken(payload) {
  if (!payload) return null;
  const u = getUserById(payload.sub);
  return u ? userPublic(u) : null;
}

module.exports = {
  signToken,
  verifyToken,
  authOptional,
  requireAuth,
  requireRole,
  login,
  meFromToken,
  bcrypt,
};
