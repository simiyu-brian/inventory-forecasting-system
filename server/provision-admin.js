#!/usr/bin/env node
/**
 * Run once when installing the system for a new business:
 *   cd server && node provision-admin.js
 *
 * Creates the first Management account. All other accounts are
 * created from inside the app via Settings → Invite User.
 */
require('dotenv').config();
const bcrypt   = require('bcrypt');
const { v4: uuid } = require('uuid');
const readline = require('readline');
const { getDb } = require('./db');

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const askHidden = (q) => new Promise((res) => {
  process.stdout.write(q);
  process.stdin.setRawMode(true);
  let buf = '';
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function handler(ch) {
    if (ch === '\n' || ch === '\r') {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', handler);
      process.stdout.write('\n');
      res(buf);
    } else if (ch === '') {
      process.exit();
    } else {
      buf += ch;
      process.stdout.write('*');
    }
  });
});

async function main() {
  const db = getDb();

  const existing = db.prepare(`SELECT COUNT(*) as n FROM users WHERE role = 'management' AND status = 'active'`).get();
  if (existing.n > 0) {
    console.log('\nA management account already exists.');
    console.log('Use Settings → Invite User inside the app to create additional accounts.\n');
    process.exit(0);
  }

  console.log('\n=== InvenSight - First-time Setup ===\n');

  const name     = (await ask('Owner full name:    ')).trim();
  const email    = (await ask('Owner email:        ')).trim().toLowerCase();
  const bizName  = (await ask('Business name:      ')).trim();
  const password = await askHidden('Password (min 8):   ');

  if (!name || !email || !bizName || !password) {
    console.error('\nAll fields are required. Aborting.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('\nPassword must be at least 8 characters. Aborting.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, business_name)
    VALUES (?, ?, ?, ?, 'management', 'active', ?)
  `).run(uuid(), name, email, hash, bizName);

  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('initialized', 'true')`).run();
  db.prepare(`INSERT OR REPLACE INTO system_config (key, value) VALUES ('business_name', ?)`).run(bizName);

  console.log(`\nDone. Admin account created for ${email}.`);
  console.log('Start the server and sign in at the dashboard.\n');
  rl.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
