const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// REQ-COM-01: posts never expose author identity to other Seekers —
// the author_id column is never selected here, only used internally
// for the admin-only ITruthCheck lookup (see admin.js).
router.get('/', async (req, res) => {
  const [posts] = await pool.query(
    `SELECT id, text, status, created_at FROM community_posts WHERE status != 'removed' ORDER BY created_at DESC LIMIT 100`
  );
  const ids = posts.map(p => p.id);
  const [replies] = ids.length
    ? await pool.query(
        `SELECT cr.post_id, cr.text, cr.created_at, u.name as owner_name
         FROM community_replies cr JOIN users u ON u.id = cr.owner_id WHERE cr.post_id IN (?)`, [ids])
    : [[]];
  res.json({ posts: posts.map(p => ({ ...p, replies: replies.filter(r => r.post_id === p.id) })) });
});

// REQ-COM-01: create an anonymous post (any authenticated Seeker).
router.post('/', requireAuth, requireRole('seeker'), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required.' });
  const [result] = await pool.query('INSERT INTO community_posts (author_id, text) VALUES (?, ?)', [req.user.id, text.slice(0, 1000)]);
  res.status(201).json({ id: result.insertId });
});

// REQ-COM-02: owner replies with a visible Owner badge (name shown, unlike Seeker posts).
router.post('/:id/reply', requireAuth, requireRole('owner'), async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required.' });
  await pool.query('INSERT INTO community_replies (post_id, owner_id, text) VALUES (?,?,?)', [req.params.id, req.user.id, text.slice(0, 1000)]);
  res.status(201).json({ ok: true });
});

// REQ-COM-03: flag an abusive post for moderation.
router.post('/:id/flag', requireAuth, async (req, res) => {
  await pool.query('UPDATE community_posts SET status = \'flagged\' WHERE id = ?', [req.params.id]);
  await pool.query('INSERT INTO flags (target_type, target_id, flagged_by, reason) VALUES (\'post\', ?, ?, ?)', [req.params.id, req.user.id, req.body?.reason || null]);
  res.json({ ok: true });
});

module.exports = router;
