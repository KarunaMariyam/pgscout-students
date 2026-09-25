const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { geocodeAddress, distanceKm } = require('../utils/geocode');

const router = express.Router();

// CIT Coimbatore campus reference point, used as the default search origin
// and for the Institution Module's campus-radius view (Section 4.8).
const CIT_LAT = 11.0296, CIT_LNG = 76.9349;

async function attachExtras(listings) {
  if (!listings.length) return listings;
  const ids = listings.map(l => l.id);
  const [amenities] = await pool.query(
    `SELECT la.listing_id, a.name FROM listing_amenities la JOIN amenities a ON a.id = la.amenity_id WHERE la.listing_id IN (?)`,
    [ids]
  );
  const [photos] = await pool.query(`SELECT listing_id, url FROM photos WHERE listing_id IN (?)`, [ids]);
  const [rooms] = await pool.query(`SELECT * FROM rooms WHERE listing_id IN (?)`, [ids]);
  const [ratings] = await pool.query(
    `SELECT listing_id, AVG(stars) as avg_rating, COUNT(*) as review_count FROM reviews WHERE listing_id IN (?) AND status='published' GROUP BY listing_id`,
    [ids]
  );
  return listings.map(l => ({
    ...l,
    amenities: amenities.filter(a => a.listing_id === l.id).map(a => a.name),
    photos: photos.filter(p => p.listing_id === l.id).map(p => p.url),
    rooms: rooms.filter(r => r.listing_id === l.id),
    avg_rating: (ratings.find(r => r.listing_id === l.id)?.avg_rating) || null,
    review_count: (ratings.find(r => r.listing_id === l.id)?.review_count) || 0,
    distance_km: distanceKm(CIT_LAT, CIT_LNG, l.lat, l.lng),
  }));
}

// REQ-SRC-01..05: search + filter approved listings.
router.get('/', async (req, res) => {
  const { q = '', gender = '', maxRent = '', amenity = '', sort = 'distance' } = req.query;
  try {
    let sql = `SELECT DISTINCT l.* FROM listings l LEFT JOIN rooms r ON r.listing_id = l.id WHERE l.status = 'approved'`;
    const params = [];
    if (q) { sql += ` AND (l.name LIKE ? OR l.area LIKE ? OR l.address LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (gender) { sql += ` AND r.gender_pref = ?`; params.push(gender); }
    if (maxRent) { sql += ` AND r.price <= ?`; params.push(Number(maxRent)); }
    if (amenity) { sql += ` AND l.id IN (SELECT la.listing_id FROM listing_amenities la JOIN amenities a ON a.id=la.amenity_id WHERE a.name = ?)`; params.push(amenity); }
    const [rows] = await pool.query(sql, params);
    let listings = await attachExtras(rows);

    if (sort === 'price') listings.sort((a, b) => Math.min(...(a.rooms.map(r=>r.price)||[Infinity])) - Math.min(...(b.rooms.map(r=>r.price)||[Infinity])));
    else if (sort === 'rating') listings.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else listings.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));

    if (!listings.length) return res.json({ listings: [], message: 'No listings match yet — try relaxing a filter.' });
    res.json({ listings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    const [listing] = await attachExtras(rows);
    const [reviews] = await pool.query(
      `SELECT r.id, r.stars, r.text, r.status, r.created_at, u.name as seeker_name
       FROM reviews r JOIN users u ON u.id = r.seeker_id
       WHERE r.listing_id = ? AND r.status != 'removed' ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    const [responses] = await pool.query(
      `SELECT review_id, text, created_at FROM review_responses WHERE review_id IN (${reviews.map(()=>'?').join(',') || 'NULL'})`,
      reviews.map(r => r.id)
    );
    listing.reviews = reviews.map(r => ({ ...r, response: responses.find(x => x.review_id === r.id) || null }));
    res.json(listing);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load listing.' });
  }
});

// REQ-LST-01: owner creates a listing with one or more rooms.
router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
  const { name, address, area, curfew_time, rules, amenities = [], rooms = [], photos = [] } = req.body || {};
  if (!name || !address || !area || !rooms.length) {
    return res.status(400).json({ error: 'name, address, area and at least one room are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { lat, lng } = await geocodeAddress(`${address}, ${area}, Coimbatore`);
    const [listingResult] = await conn.query(
      'INSERT INTO listings (owner_id, name, address, area, lat, lng, curfew_time, rules, status) VALUES (?,?,?,?,?,?,?,?,\'pending\')',
      [req.user.id, name, address, area, lat, lng, curfew_time || null, rules || null]
    );
    const listingId = listingResult.insertId;

    for (const amenityName of amenities) {
      await conn.query('INSERT IGNORE INTO amenities (name) VALUES (?)', [amenityName]);
      const [[a]] = await conn.query('SELECT id FROM amenities WHERE name = ?', [amenityName]);
      await conn.query('INSERT IGNORE INTO listing_amenities (listing_id, amenity_id) VALUES (?, ?)', [listingId, a.id]);
    }
    for (const url of photos.slice(0, 5)) {
      await conn.query('INSERT INTO photos (listing_id, url) VALUES (?, ?)', [listingId, url]);
    }
    for (const room of rooms) {
      await conn.query(
        'INSERT INTO rooms (listing_id, type, price, deposit, gender_pref, status) VALUES (?,?,?,?,?,\'pending\')',
        [listingId, room.type || 'Double', room.price, room.deposit || room.price * 2, room.gender_pref || 'co']
      );
    }
    await conn.commit();
    res.status(201).json({ id: listingId, status: 'pending' });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Could not create listing.' });
  } finally {
    conn.release();
  }
});

router.get('/mine/owner', requireAuth, requireRole('owner'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
  const listings = await attachExtras(rows);
  res.json({ listings });
});

// REQ-LST-02 / statechart (4.3.4): update a room's own status (e.g. Maintenance).
router.patch('/rooms/:roomId/status', requireAuth, requireRole('owner'), async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['available', 'maintenance', 'unlisted'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  try {
    const [[room]] = await pool.query(
      `SELECT r.*, l.owner_id FROM rooms r JOIN listings l ON l.id = r.listing_id WHERE r.id = ?`, [req.params.roomId]
    );
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
    await pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, req.params.roomId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update room status.' });
  }
});

module.exports = router;
