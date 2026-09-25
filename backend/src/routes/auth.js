const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const ROLES = ['seeker', 'owner', 'institution_admin', 'system_admin'];

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// REQ-ACC-01: register Seeker / PG Owner / Institution Admin accounts.
router.post('/register', async (req, res) => {
  const { name, email, password, role, institution_name } = req.body || {};
  if (!name || !email || !password || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'name, email, password and a valid role are required.' });
  }
  if (role === 'institution_admin' && !institution_name) {
    return res.status(400).json({ error: 'institution_name is required for Institution Admin accounts.' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'An account with that email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, institution_name) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role, institution_name || null]
    );
    const user = { id: result.insertId, name, email, role };
    // REQ-ACC-02 (email verification) is stubbed in this student-project build:
    // accounts are activated immediately so the demo works without a mail
    // account configured; wiring a real verification link is a documented TBD.
    res.status(201).json({ token: sign(user), user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// REQ-ACC-03: sign in.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (user.is_suspended) return res.status(403).json({ error: 'This account has been suspended.' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, institution_name: user.institution_name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, institution_name FROM users WHERE id = ?', [req.user.id]);
  res.json(rows[0] || null);
});

module.exports = router;
