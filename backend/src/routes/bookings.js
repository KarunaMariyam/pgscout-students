const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

async function freeRoomAndNotifyWaitlist(roomId) {
  await pool.query("UPDATE rooms SET status = 'available' WHERE id = ?", [roomId]);
  const [[entry]] = await pool.query(
    'SELECT w.*, u.email, u.name FROM waitlist w JOIN users u ON u.id = w.seeker_id WHERE w.room_id = ? AND w.notified_at IS NULL ORDER BY w.created_at ASC LIMIT 1',
    [roomId]
  );
  if (entry) {
    await pool.query('UPDATE waitlist SET notified_at = NOW() WHERE id = ?', [entry.id]);
    await notify({
      userId: entry.seeker_id, type: 'waitlist_available',
      message: `A room you waitlisted for is now available — book it before someone else does!`,
      email: entry.email, emailSubject: 'A waitlisted room is now available',
    });
  }
}

// REQ-BKG-01/03: send a booking request; auto-locks the room to Reserved.
router.post('/', requireAuth, requireRole('seeker'), async (req, res) => {
  const { roomId, moveInDate, message } = req.body || {};
  if (!roomId || !moveInDate) return res.status(400).json({ error: 'roomId and moveInDate are required.' });
  try {
    const [[room]] = await pool.query(
      `SELECT r.*, l.name as listing_name, l.owner_id, o.email as owner_email
       FROM rooms r JOIN listings l ON l.id = r.listing_id JOIN users o ON o.id = l.owner_id WHERE r.id = ?`,
      [roomId]
    );
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const [existing] = await pool.query(
      "SELECT id FROM bookings WHERE room_id = ? AND seeker_id = ? AND status IN ('new','pending')",
      [roomId, req.user.id]
    );
    if (existing.length) return res.status(409).json({ error: 'You already have an active request for this room.' });

    if (room.status !== 'available') {
      return res.status(409).json({ error: `This room is currently ${room.status} and not open for new requests. You can join the waitlist instead.` });
    }

    const [result] = await pool.query(
      'INSERT INTO bookings (room_id, seeker_id, move_in_date, message, status) VALUES (?,?,?,?,\'new\')',
      [roomId, req.user.id, moveInDate, message || null]
    );
    await pool.query("UPDATE rooms SET status = 'reserved' WHERE id = ?", [roomId]);
    await notify({
      userId: room.owner_id, type: 'new_booking',
      message: `New booking request for ${room.listing_name} from ${req.user.name}.`,
      email: room.owner_email, emailSubject: 'New PGScout booking request',
    });
    res.status(201).json({ id: result.insertId, status: 'new' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not send booking request.' });
  }
});

// REQ-BKG-02/04: owner accepts, declines, or marks pending-further-discussion.
router.patch('/:id', requireAuth, requireRole('owner'), async (req, res) => {
  const { action } = req.body || {}; // 'accept' | 'decline' | 'pending'
  try {
    const [[booking]] = await pool.query(
      `SELECT b.*, r.listing_id, l.owner_id, l.name as listing_name, u.email as seeker_email, u.name as seeker_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = b.seeker_id
       WHERE b.id = ?`, [req.params.id]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });

    if (action === 'accept') {
      await pool.query("UPDATE bookings SET status='accepted', responded_at=NOW() WHERE id=?", [booking.id]);
      await pool.query("UPDATE rooms SET status='occupied' WHERE id=?", [booking.room_id]);
      await notify({ userId: booking.seeker_id, type: 'booking_accepted',
        message: `Your booking for ${booking.listing_name} was accepted!`, email: booking.seeker_email, emailSubject: 'Booking accepted' });
    } else if (action === 'decline') {
      await pool.query("UPDATE bookings SET status='declined', responded_at=NOW() WHERE id=?", [booking.id]);
      await freeRoomAndNotifyWaitlist(booking.room_id);
      await notify({ userId: booking.seeker_id, type: 'booking_declined',
        message: `Your booking request for ${booking.listing_name} was declined.`, email: booking.seeker_email, emailSubject: 'Booking update' });
    } else if (action === 'pending') {
      await pool.query("UPDATE bookings SET status='pending' WHERE id=?", [booking.id]);
    } else {
      return res.status(400).json({ error: "action must be 'accept', 'decline', or 'pending'." });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update booking.' });
  }
});

// REQ-BKG-05: join a waitlist for a full/unavailable room.
router.post('/rooms/:roomId/waitlist', requireAuth, requireRole('seeker'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM waitlist WHERE room_id = ? AND seeker_id = ?', [req.params.roomId, req.user.id]);
    if (existing.length) return res.status(409).json({ error: 'You are already on the waitlist for this room.' });
    await pool.query('INSERT INTO waitlist (room_id, seeker_id) VALUES (?, ?)', [req.params.roomId, req.user.id]);
    await pool.query("UPDATE rooms SET status = 'waitlisted' WHERE id = ? AND status != 'occupied'", [req.params.roomId]);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not join waitlist.' });
  }
});

router.get('/mine', requireAuth, requireRole('seeker'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, l.name as listing_name FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN listings l ON l.id=r.listing_id
     WHERE b.seeker_id = ? ORDER BY b.reserved_at DESC`, [req.user.id]
  );
  res.json({ bookings: rows });
});

router.get('/owner/inbox', requireAuth, requireRole('owner'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, l.name as listing_name, u.name as seeker_name
     FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=b.seeker_id
     WHERE l.owner_id = ? ORDER BY b.reserved_at DESC`, [req.user.id]
  );
  res.json({ bookings: rows });
});

// REQ-BKG-04: 24-hour auto-timeout sweep — called on an interval from server.js.
async function sweepExpiredReservations() {
  try {
    const [expired] = await pool.query(
      `SELECT b.id, b.room_id, b.seeker_id, l.name as listing_name, u.email as seeker_email
       FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=b.seeker_id
       WHERE b.status IN ('new','pending') AND b.reserved_at < (NOW() - INTERVAL 24 HOUR)`
    );
    for (const b of expired) {
      await pool.query("UPDATE bookings SET status='declined', responded_at=NOW() WHERE id=?", [b.id]);
      await freeRoomAndNotifyWaitlist(b.room_id);
      await notify({ userId: b.seeker_id, type: 'booking_timeout',
        message: `Your booking request for ${b.listing_name} timed out after 24 hours with no owner response.`,
        email: b.seeker_email, emailSubject: 'Booking request timed out' });
    }
  } catch (e) {
    console.error('[sweepExpiredReservations]', e.message);
  }
}

module.exports = { router, sweepExpiredReservations };
