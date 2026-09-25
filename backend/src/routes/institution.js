const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { distanceKm } = require('../utils/geocode');

const router = express.Router();
const CIT_LAT = 11.0296, CIT_LNG = 76.9349; // campus reference point (Section 4.8)

// REQ-INS-01/04: listings within a configurable radius of the campus.
router.get('/listings', requireAuth, requireRole('institution_admin'), async (req, res) => {
  const radiusKm = Number(req.query.radius) || 4;
  const [rows] = await pool.query("SELECT * FROM listings WHERE status = 'approved'");
  const withDist = rows.map(l => ({ ...l, distance_km: distanceKm(CIT_LAT, CIT_LNG, l.lat, l.lng) }))
    .filter(l => l.distance_km !== null && l.distance_km <= radiusKm);
  const ids = withDist.map(l => l.id);
  const [ratings] = ids.length
    ? await pool.query(`SELECT listing_id, AVG(stars) avg_rating, COUNT(*) review_count FROM reviews WHERE listing_id IN (?) AND status='published' GROUP BY listing_id`, [ids])
    : [[]];
  const [flagCounts] = ids.length
    ? await pool.query(`SELECT listing_id, COUNT(*) flagged FROM reviews WHERE listing_id IN (?) AND status='flagged' GROUP BY listing_id`, [ids])
    : [[]];
  res.json({ listings: withDist.map(l => ({
    ...l,
    avg_rating: ratings.find(r => r.listing_id === l.id)?.avg_rating || null,
    review_count: ratings.find(r => r.listing_id === l.id)?.review_count || 0,
    flagged_count: flagCounts.find(f => f.listing_id === l.id)?.flagged || 0,
  })) });
});

// REQ-INS-02: tag / untag a listing as Institution Recommended.
router.post('/recommend/:listingId', requireAuth, requireRole('institution_admin'), async (req, res) => {
  const [[listing]] = await pool.query('SELECT recommended FROM listings WHERE id = ?', [req.params.listingId]);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  const newVal = listing.recommended ? 0 : 1;
  await pool.query('UPDATE listings SET recommended = ?, recommended_institution = ? WHERE id = ?', [newVal, newVal ? req.user.institution_name : null, req.params.listingId]);
  res.json({ recommended: !!newVal });
});

// REQ-INS-03: analytics — average rating, review counts, flagged trends nearby.
router.get('/analytics', requireAuth, requireRole('institution_admin'), async (req, res) => {
  const radiusKm = Number(req.query.radius) || 4;
  const [rows] = await pool.query("SELECT * FROM listings WHERE status = 'approved'");
  const nearby = rows.filter(l => {
    const d = distanceKm(CIT_LAT, CIT_LNG, l.lat, l.lng);
    return d !== null && d <= radiusKm;
  });
  const ids = nearby.map(l => l.id);
  const [ratings] = ids.length ? await pool.query(`SELECT AVG(stars) avg_rating FROM reviews WHERE listing_id IN (?) AND status='published'`, [ids]) : [[{ avg_rating: null }]];
  const [flagged] = ids.length ? await pool.query(`SELECT COUNT(*) c FROM reviews WHERE listing_id IN (?) AND status='flagged'`, [ids]) : [[{ c: 0 }]];
  res.json({
    listingsNearby: nearby.length,
    recommended: nearby.filter(l => l.recommended).length,
    avgRating: ratings[0]?.avg_rating || null,
    flaggedReviews: flagged[0]?.c || 0,
  });
});

module.exports = router;
