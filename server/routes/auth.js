const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { v4: uuid } = require('uuid');
const rateLimit    = require('express-rate-limit');
const { getDb }    = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendPasswordReset } = require('../email');

// ── helpers ──────────────────────────────────────────────────────────────────

function signAccess(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function makeRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiresAt() {
  const days = parseInt(process.env.JWT_REFRESH_DAYS || '7');
  return Math.floor(Date.now() / 1000) + days * 86400;
}

function setRefreshCookie(res, token) {
  const days = parseInt(process.env.JWT_REFRESH_DAYS || '7');
  res.cookie('iifsa_refresh', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: days * 86400 * 1000,
    path: '/api/auth',
  });
}

function safeUser(u) {
  const { password_hash, invite_token, invite_expires_at, reset_token, reset_expires_at, ...rest } = u;
  return rest;
}

// ── login limiter ─────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { credential, password } = req.body;
  if (!credential || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  const db   = getDb();
  const user = db.prepare(
    `SELECT * FROM users WHERE (email = ? OR username = ?) AND status = 'active'`
  ).get(credential, credential);

  if (!user?.password_hash) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  const accessToken  = signAccess(user);
  const refreshToken = makeRefreshToken();

  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)`
  ).run(uuid(), user.id, hashToken(refreshToken), refreshExpiresAt());

  db.prepare(`UPDATE users SET last_login_at = unixepoch() WHERE id = ?`).run(user.id);

  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user: safeUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.userId);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Account not found or deactivated.' });
  }
  res.json(safeUser(user));
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const token = req.cookies?.iifsa_refresh;
  if (!token) return res.status(401).json({ error: 'No refresh token.' });

  const db   = getDb();
  const row  = db.prepare(
    `SELECT rt.*, u.id AS uid, u.role, u.name, u.email, u.status
     FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = ? AND rt.expires_at > unixepoch()`
  ).get(hashToken(token));

  if (!row || row.status !== 'active') {
    return res.status(401).json({ error: 'Refresh token invalid or expired.' });
  }

  // Rotate: delete old, issue new
  const newRefresh = makeRefreshToken();
  db.prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(hashToken(token));
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)`
  ).run(uuid(), row.uid, hashToken(newRefresh), refreshExpiresAt());

  setRefreshCookie(res, newRefresh);
  res.json({ accessToken: signAccess({ id: row.uid, role: row.role, name: row.name, email: row.email }) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.iifsa_refresh;
  if (token) {
    getDb().prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`).run(hashToken(token));
  }
  res.clearCookie('iifsa_refresh', { path: '/api/auth' });
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  // Always 200 - never reveal whether an email exists
  res.json({ ok: true, message: 'If an account with that email exists, a reset link has been sent.' });

  const { email } = req.body;
  if (!email) return;

  const db   = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE email = ? AND status = 'active'`).get(email);
  if (!user) return;

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  db.prepare(`UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?`)
    .run(hashToken(token), expiresAt, user.id);

  try {
    await sendPasswordReset({ to: user.email, name: user.name, token });
  } catch (err) {
    console.error('Failed to send reset email:', err.message);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db   = getDb();
  const user = db.prepare(
    `SELECT * FROM users WHERE reset_token = ? AND reset_expires_at > unixepoch()`
  ).get(hashToken(token));

  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare(
    `UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?`
  ).run(hash, user.id);

  res.json({ ok: true, message: 'Password updated. You can now sign in.' });
});

module.exports = router;
