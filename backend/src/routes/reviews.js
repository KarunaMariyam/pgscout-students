const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// REQ-REV-01/02: only a seeker with a completed/accepted booking may review.
router.post('/', requireAuth, requireRole('seeker'), async (req, res) => {
  const { bookingId, stars, text } = req.body || {};
  if (!bookingId || !stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'bookingId and a 1-5 stars value are required.' });
  try {
    const [[booking]] = await pool.query(
      `SELECT b.*, r.listing_id FROM bookings b JOIN rooms r ON r.id=b.room_id WHERE b.id = ?`, [bookingId]
    );
    if (!booking || booking.seeker_id !== req.user.id) return res.status(403).json({ error: 'Not your booking.' });
    if (booking.status !== 'accepted') return res.status(403).json({ error: 'Only a confirmed stay can be reviewed.' });

    const [existing] = await pool.query('SELECT id FROM reviews WHERE booking_id = ?', [bookingId]);
    if (existing.length) return res.status(409).json({ error: 'You already reviewed this stay.' });

    const [result] = await pool.query(
      'INSERT INTO reviews (booking_id, listing_id, seeker_id, stars, text) VALUES (?,?,?,?,?)',
      [bookingId, booking.listing_id, req.user.id, stars, (text || '').slice(0, 1000)]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not submit review.' });
  }
});

// REQ-REV-04: owner posts one public response per review.
router.post('/:id/response', requireAuth, requireRole('owner'), async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required.' });
  try {
    const [[review]] = await pool.query(
      `SELECT rv.id, l.owner_id FROM reviews rv JOIN listings l ON l.id = rv.listing_id WHERE rv.id = ?`, [req.params.id]
    );
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    if (review.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
    const [existing] = await pool.query('SELECT id FROM review_responses WHERE review_id = ?', [req.params.id]);
    if (existing.length) return res.status(409).json({ error: 'You already responded to this review.' });
    await pool.query('INSERT INTO review_responses (review_id, owner_id, text) VALUES (?,?,?)', [req.params.id, req.user.id, text.slice(0, 1000)]);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not post response.' });
  }
});

// REQ-REV-05: flag a review for moderation.
router.post('/:id/flag', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE reviews SET status = \'flagged\' WHERE id = ?', [req.params.id]);
    await pool.query('INSERT INTO flags (target_type, target_id, flagged_by, reason) VALUES (\'review\', ?, ?, ?)', [req.params.id, req.user.id, req.body?.reason || null]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not flag review.' });
  }
});

module.exports = router;
