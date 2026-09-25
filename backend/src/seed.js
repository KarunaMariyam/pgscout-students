// Populates demo data: an owner, a few approved listings with rooms near
// CIT Coimbatore, a seeker, a completed booking + review, and a sample
// community post — so the app has something to show immediately after setup.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function upsertUser(name, email, password, role, institution_name = null) {
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return existing[0].id;
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, institution_name) VALUES (?,?,?,?,?)',
    [name, email, hash, role, institution_name]
  );
  return result.insertId;
}

async function amenityId(name) {
  await pool.query('INSERT IGNORE INTO amenities (name) VALUES (?)', [name]);
  const [[a]] = await pool.query('SELECT id FROM amenities WHERE name = ?', [name]);
  return a.id;
}

async function seedListing(ownerId, { name, address, area, lat, lng, curfew, rules, amenities, rooms, recommended }) {
  const [result] = await pool.query(
    "INSERT INTO listings (owner_id, name, address, area, lat, lng, curfew_time, rules, status, recommended, recommended_institution) VALUES (?,?,?,?,?,?,?,?,'approved',?,?)",
    [ownerId, name, address, area, lat, lng, curfew, rules, recommended ? 1 : 0, recommended ? 'CIT Coimbatore' : null]
  );
  const listingId = result.insertId;
  for (const a of amenities) {
    const id = await amenityId(a);
    await pool.query('INSERT IGNORE INTO listing_amenities (listing_id, amenity_id) VALUES (?, ?)', [listingId, id]);
  }
  const roomIds = [];
  for (const r of rooms) {
    const [rr] = await pool.query(
      "INSERT INTO rooms (listing_id, type, price, deposit, gender_pref, status) VALUES (?,?,?,?,?,'available')",
      [listingId, r.type, r.price, r.deposit, r.gender]
    );
    roomIds.push(rr.insertId);
  }
  return { listingId, roomIds };
}

async function main() {
  console.log('Seeding PGScout demo data...');
  const owner1 = await upsertUser('A. Anand', 'anand.owner@example.com', 'password123', 'owner');
  const owner2 = await upsertUser('Blue Orchid Estates', 'blueorchid.owner@example.com', 'password123', 'owner');
  const seeker1 = await upsertUser('Vignesh R.', 'vignesh.seeker@example.com', 'password123', 'seeker');
  await upsertUser('CIT Institution Desk', 'institution.admin@example.com', 'password123', 'institution_admin', 'CIT Coimbatore');
  await upsertUser('System Admin', 'admin@example.com', 'password123', 'system_admin');

  const [existingListings] = await pool.query('SELECT COUNT(*) c FROM listings');
  if (existingListings[0].c === 0) {
    const l1 = await seedListing(owner1, {
      name: 'Anand Boarding House', address: '14 Nehru Street', area: 'Peelamedu, Coimbatore',
      lat: 11.0296, lng: 76.9455, curfew: '10:00 PM', rules: 'Gate closes 10 PM. No smoking on premises.',
      amenities: ['Wi-Fi', 'Food included', 'Laundry'],
      rooms: [{ type: 'Double', price: 7500, deposit: 15000, gender: 'boys' }, { type: 'Triple', price: 6200, deposit: 12000, gender: 'boys' }],
      recommended: true,
    });
    const l2 = await seedListing(owner2, {
      name: 'Blue Orchid Residency', address: '22 Avinashi Road', area: 'Peelamedu, Coimbatore',
      lat: 11.0310, lng: 76.9420, curfew: '11:00 PM', rules: 'Biometric entry. Guests must register at the front desk.',
      amenities: ['Wi-Fi', 'Food included', 'AC', 'Attached bathroom'],
      rooms: [{ type: 'Single', price: 11500, deposit: 23000, gender: 'girls' }],
      recommended: true,
    });
    await seedListing(owner1, {
      name: 'Green Nest Co-living', address: '5 Sathy Road', area: 'Saravanampatti, Coimbatore',
      lat: 11.0740, lng: 77.0080, curfew: '8:00 PM (visitors)', rules: 'Monthly rent due by the 5th.',
      amenities: ['Wi-Fi', 'AC', 'Attached bathroom', 'Laundry'],
      rooms: [{ type: 'Single', price: 9800, deposit: 19600, gender: 'co' }],
      recommended: false,
    });

    // A completed booking + published review so the demo has real review content.
    const [[room]] = await pool.query('SELECT id FROM rooms WHERE listing_id = ? LIMIT 1', [l1.listingId]);
    const [bk] = await pool.query(
      "INSERT INTO bookings (room_id, seeker_id, move_in_date, status, responded_at) VALUES (?, ?, CURDATE(), 'accepted', NOW())",
      [room.id, seeker1]
    );
    await pool.query(
      'INSERT INTO reviews (booking_id, listing_id, seeker_id, stars, text) VALUES (?,?,?,?,?)',
      [bk.insertId, l1.listingId, seeker1, 5, 'Food is homely and the owner is responsive to complaints. Walkable to CIT.']
    );

    await pool.query('INSERT INTO community_posts (author_id, text) VALUES (?, ?)', [seeker1, 'Anyone know a good, quiet PG near Saravanampatti under 8k? Starting my internship there next month.']);
  }

  console.log('Seed complete. Demo logins (password: password123):');
  console.log('  Owner:              anand.owner@example.com');
  console.log('  Owner:              blueorchid.owner@example.com');
  console.log('  Seeker:             vignesh.seeker@example.com');
  console.log('  Institution Admin:  institution.admin@example.com');
  console.log('  System Admin:       admin@example.com');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
