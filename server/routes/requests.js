const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const {
  sendRequestReceived, sendApprovalNotification,
  sendSetupToken, sendTokenIssuedConfirmation,
} = require('../email');

const IS_PUBLIC = process.env.IS_PUBLIC_INSTANCE === 'true';

function onlyPublic(req, res, next) {
  if (IS_PUBLIC) return next();
  const initialized = getDb().prepare(`SELECT value FROM system_config WHERE key = 'initialized'`).get();
  if (!initialized) return next();
  return res.status(404).json({ error: 'Not found.' });
}

function hash(t) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

// POST /api/requests - submit an access request
router.post('/', onlyPublic, async (req, res) => {
  const { businessName, name, email, phone, message, password } = req.body;

  if (!businessName || !name || !email || !phone || !password) {
    return res.status(400).json({
      error: 'Business name, your name, email, phone number, and password are required.',
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const db           = getDb();
  const id           = uuid();
  const key          = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(password, 12);

  db.prepare(`
    INSERT INTO access_requests (id, business_name, name, email, phone, message, approval_key_hash, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, businessName, name, email, phone, message || null, hash(key), passwordHash);

  const approvalUrl = `${process.env.CLIENT_URL}/approve-request?id=${id}&key=${key}`;

  try {
    await sendRequestReceived({ to: email, name, businessName });
  } catch (err) {
    console.error('Email error (request confirmation):', err.message);
  }

  try {
    await sendApprovalNotification({
      to: process.env.DEVELOPER_EMAIL,
      businessName, name, email, phone, message, approvalUrl,
    });
  } catch (err) {
    console.error('Email error (approval notification):', err.message);
  }

  res.json({ ok: true });
});

// GET /api/requests/:id/details - load request details for the approval page
router.get('/:id/details', onlyPublic, (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Approval key is required.' });

  const db  = getDb();
  const row = db.prepare(
    `SELECT * FROM access_requests WHERE id = ? AND status = 'pending'`
  ).get(req.params.id);

  if (!row)                            return res.status(404).json({ error: 'Request not found or already reviewed.' });
  if (row.approval_key_hash !== hash(key)) return res.status(403).json({ error: 'Invalid approval key.' });

  const { approval_key_hash, setup_token_hash, ...safe } = row;
  res.json(safe);
});

// POST /api/requests/:id/approve - developer confirms; generates + sends setup token
router.post('/:id/approve', onlyPublic, async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Approval key is required.' });

  const db  = getDb();
  const row = db.prepare(
    `SELECT * FROM access_requests WHERE id = ? AND status = 'pending'`
  ).get(req.params.id);

  if (!row)                            return res.status(404).json({ error: 'Request not found or already reviewed.' });
  if (row.approval_key_hash !== hash(key)) return res.status(403).json({ error: 'Invalid approval key.' });

  if (!row.password_hash) {
    return res.status(400).json({
      error: 'This request has no stored credentials. The requester must submit a new request.',
    });
  }

  const setupToken = jwt.sign(
    {
      purpose:      'invensight-setup',
      email:        row.email,
      name:         row.name,
      businessName: row.business_name,
      requestId:    row.id,
      passwordHash: row.password_hash,
    },
    process.env.ADMIN_SECRET,
    { expiresIn: '7d' }
  );

  db.prepare(`
    UPDATE access_requests
    SET status = 'approved', setup_token_hash = ?, reviewed_at = unixepoch()
    WHERE id = ?
  `).run(hash(setupToken), row.id);

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔑  Setup token (dev only):\n' + setupToken + '\n');
  }

  try {
    await sendSetupToken({ to: row.email, name: row.name, businessName: row.business_name, token: setupToken });
  } catch (err) {
    console.error('Email error (setup token to requester):', err.message);
  }

  try {
    await sendTokenIssuedConfirmation({
      to: process.env.DEVELOPER_EMAIL,
      name: row.name, email: row.email, businessName: row.business_name,
    });
  } catch (err) {
    console.error('Email error (token issued confirmation):', err.message);
  }

  res.json({ ok: true, message: `Setup token issued to ${row.email}.` });
});

module.exports = router;
