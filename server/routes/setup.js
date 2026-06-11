const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');

function hash(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

// GET /api/setup/status - checked by the frontend on every load
router.get('/status', (req, res) => {
  const db     = getDb();
  const config = db.prepare(`SELECT value FROM system_config WHERE key = 'initialized'`).get();
  res.json({
    initialized:      config?.value === 'true',
    isPublicInstance: process.env.IS_PUBLIC_INSTANCE === 'true',
  });
});

// POST /api/setup - run once; creates the first Management user
router.post('/', async (req, res) => {
  const db     = getDb();
  const config = db.prepare(`SELECT value FROM system_config WHERE key = 'initialized'`).get();

  if (config?.value === 'true') {
    return res.status(409).json({ error: 'System is already initialized.' });
  }

  const { businessName, timezone, currency, setupToken } = req.body;

  if (!businessName || !setupToken) {
    return res.status(400).json({ error: 'Business name and setup token are required.' });
  }

  // Validate JWT setup token
  let payload;
  try {
    payload = jwt.verify(setupToken, process.env.ADMIN_SECRET);
  } catch {
    return res.status(400).json({ error: 'Setup token is invalid or has expired.' });
  }

  if (payload.purpose !== 'invensight-setup') {
    return res.status(400).json({ error: 'Invalid setup token.' });
  }

  // Credentials travel inside the token - reject tokens from the old flow
  if (!payload.passwordHash || !payload.email || !payload.name) {
    return res.status(400).json({
      error: 'This token was issued under an older flow. The requester must submit a new request.',
    });
  }

  // Single-use enforcement
  const tokenHash = hash(setupToken);
  const consumed  = db.prepare(
    `SELECT token_hash FROM consumed_setup_tokens WHERE token_hash = ?`
  ).get(tokenHash);

  if (consumed) {
    return res.status(400).json({ error: 'This setup token has already been used.' });
  }

  const userId = uuid();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, business_name)
    VALUES (?, ?, ?, ?, 'management', 'active', ?)
  `).run(userId, payload.name, payload.email, payload.passwordHash, businessName);

  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('initialized', 'true')`).run();
  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('business_name', ?)`).run(businessName);
  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('timezone', ?)`).run(timezone || 'Africa/Nairobi');
  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('currency', ?)`).run(currency || 'KES');

  db.prepare(`INSERT INTO consumed_setup_tokens (token_hash) VALUES (?)`).run(tokenHash);

  res.json({ ok: true });
});

module.exports = router;
