const pool = require('../db');
const { notifyUser } = require('../socket');
const { sendMail } = require('./mailer');

// REQ-NOT-01/02/03: writes a persistent notification row, pushes it over
// Socket.IO for an instant in-app update, and optionally emails it.
async function notify({ userId, type, message, email = null, emailSubject = null }) {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
    [userId, type, message]
  );
  const payload = { id: result.insertId, type, message, is_read: 0, created_at: new Date().toISOString() };
  notifyUser(userId, payload);
  if (email) await sendMail(email, emailSubject || 'PGScout notification', `<p>${message}</p>`);
  return payload;
}

module.exports = { notify };
