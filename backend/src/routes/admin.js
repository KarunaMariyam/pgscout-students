const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();
router.use(requireAuth, requireRole('system_admin'));

async function audit(adminId, action, targetType, targetId, details) {
  await pool.query('INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)', [adminId, action, targetType || null, targetId || null, details || null]);
}

// REQ-LST-03 / REQ-ADM-01: pending listings queue.
router.get('/pending-listings', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT l.*, u.email as owner_email, u.name as owner_name FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.status = 'pending' ORDER BY l.created_at ASC`
  );
  res.json({ listings: rows });
});

router.patch('/listings/:id/approve', async (req, res) => {
  const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  await pool.query("UPDATE listings SET status = 'approved' WHERE id = ?", [req.params.id]);
  await pool.query("UPDATE rooms SET status = 'available' WHERE listing_id = ? AND status = 'pending'", [req.params.id]);
  await audit(req.user.id, 'approve_listing', 'listing', req.params.id, listing.name);
  await notify({ userId: listing.owner_id, type: 'listing_approved', message: `Your listing "${listing.name}" was approved and is now live.` });
  res.json({ ok: true });
});

router.patch('/listings/:id/reject', async (req, res) => {
  const [[listing]] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  await pool.query("UPDATE listings SET status = 'unlisted' WHERE id = ?", [req.params.id]);
  await pool.query("UPDATE rooms SET status = 'unlisted' WHERE listing_id = ?", [req.params.id]);
  await audit(req.user.id, 'reject_listing', 'listing', req.params.id, req.body?.reason || listing.name);
  await notify({ userId: listing.owner_id, type: 'listing_rejected', message: `Your listing "${listing.name}" was rejected. ${req.body?.reason || 'Please review and resubmit.'}` });
  res.json({ ok: true });
});

// REQ-ADM-02: moderate flagged reviews/community posts.
router.get('/flags', async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM flags WHERE resolved = 0 ORDER BY created_at ASC`);
  res.json({ flags: rows });
});

router.patch('/flags/:id/resolve', async (req, res) => {
  const { action } = req.body || {}; // 'remove' | 'dismiss'
  const [[flag]] = await pool.query('SELECT * FROM flags WHERE id = ?', [req.params.id]);
  if (!flag) return res.status(404).json({ error: 'Flag not found.' });
  const table = flag.target_type === 'review' ? 'reviews' : 'community_posts';
  if (action === 'remove') {
    await pool.query(`UPDATE ${table} SET status = 'removed' WHERE id = ?`, [flag.target_id]);
  } else if (action === 'dismiss' && flag.target_type === 'review') {
    await pool.query(`UPDATE reviews SET status = 'published' WHERE id = ?`, [flag.target_id]);
  } else if (action === 'dismiss') {
    await pool.query(`UPDATE community_posts SET status = 'visible' WHERE id = ?`, [flag.target_id]);
  }
  await pool.query('UPDATE flags SET resolved = 1 WHERE id = ?', [req.params.id]);
  await audit(req.user.id, `flag_${action}`, flag.target_type, flag.target_id, null);
  res.json({ ok: true });
});

// REQ-ADM-03: suspend / reinstate a user account.
router.patch('/users/:id/suspend', async (req, res) => {
  const suspend = req.body?.suspend !== false;
  await pool.query('UPDATE users SET is_suspended = ? WHERE id = ?', [suspend ? 1 : 0, req.params.id]);
  await audit(req.user.id, suspend ? 'suspend_user' : 'reinstate_user', 'user', req.params.id, null);
  res.json({ ok: true });
});

// ITruthCheck (REQ-COM-04): admin-only, audited lookup of an anonymous post's true author.
router.get('/community/:postId/author', async (req, res) => {
  const [[row]] = await pool.query(
    `SELECT u.id, u.name, u.email FROM community_posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`, [req.params.postId]
  );
  if (!row) return res.status(404).json({ error: 'Post not found.' });
  await audit(req.user.id, 'itruthcheck_lookup', 'community_post', req.params.postId, `Revealed author for investigation`);
  res.json(row);
});

// REQ-ADM-04 / REQ-PRM-04: audit log + billing disputes view.
router.get('/audit-log', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
  res.json({ log: rows });
});

module.exports = router;
