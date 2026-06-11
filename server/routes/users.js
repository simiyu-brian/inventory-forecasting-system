const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { getDb }    = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendInvite } = require('../email');

const VALID_ROLES = ['operational', 'analytical', 'management'];

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeUser(u) {
  const { password_hash, invite_token, invite_expires_at, reset_token, reset_expires_at, ...rest } = u;
  return rest;
}

// GET /api/users - management only
router.get('/', requireAuth, requireRole('management'), (req, res) => {
  const users = getDb().prepare(
    `SELECT id, name, email, username, role, status, warehouse, department,
            business_name, created_at, last_login_at
     FROM users ORDER BY created_at DESC`
  ).all();
  res.json(users);
});

// POST /api/users/invite - management only
router.post('/invite', requireAuth, requireRole('management'), async (req, res) => {
  const { name, email, role, warehouse, department } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const db = getDb();
  if (db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 72 * 3600;
  const id        = uuid();

  db.prepare(`
    INSERT INTO users (id, name, email, role, status, warehouse, department, invite_token, invite_expires_at, created_by)
    VALUES (?, ?, ?, ?, 'invited', ?, ?, ?, ?, ?)
  `).run(id, name, email, role, warehouse || null, department || null, hashToken(token), expiresAt, req.user.userId);

  try {
    await sendInvite({ to: email, name, role, token });
  } catch (err) {
    console.error('Invite email failed:', err.message);
    // User was created - just log the failure, don't abort
  }

  res.status(201).json({ ok: true, message: `Invitation sent to ${email}.` });
});

// GET /api/users/invite/:token - validate invite token (public)
router.get('/invite/:token', (req, res) => {
  const user = getDb().prepare(
    `SELECT id, name, email, role FROM users
     WHERE invite_token = ? AND invite_expires_at > unixepoch() AND status = 'invited'`
  ).get(hashToken(req.params.token));

  if (!user) {
    return res.status(400).json({ error: 'Invitation link is invalid or has expired.' });
  }
  res.json(user);
});

// POST /api/users/invite/:token/accept - set password, activate (public)
router.post('/invite/:token/accept', async (req, res) => {
  const { password, username } = req.body;

  if (!password) return res.status(400).json({ error: 'Password is required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const db   = getDb();
  const user = db.prepare(
    `SELECT * FROM users WHERE invite_token = ? AND invite_expires_at > unixepoch() AND status = 'invited'`
  ).get(hashToken(req.params.token));

  if (!user) {
    return res.status(400).json({ error: 'Invitation link is invalid or has expired.' });
  }

  if (username) {
    const taken = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(username, user.id);
    if (taken) return res.status(409).json({ error: 'Username is already taken.' });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare(`
    UPDATE users SET
      password_hash = ?, username = COALESCE(?, username), status = 'active',
      invite_token = NULL, invite_expires_at = NULL
    WHERE id = ?
  `).run(hash, username || null, user.id);

  res.json({ ok: true, message: 'Account activated. You can now sign in.' });
});

// PUT /api/users/:id/role - management only
router.put('/:id/role', requireAuth, requireRole('management'), (req, res) => {
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const result = getDb().prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found.' });
  res.json({ ok: true });
});

// PUT /api/users/:id/deactivate - management only
router.put('/:id/deactivate', requireAuth, requireRole('management'), (req, res) => {
  if (req.params.id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }

  const result = getDb().prepare(`UPDATE users SET status = 'deactivated' WHERE id = ?`).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'User not found.' });
  res.json({ ok: true });
});

module.exports = router;
