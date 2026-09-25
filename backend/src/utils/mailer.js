const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Section 3.3 / 3.4: email notifications via Nodemailer. If no SMTP
// credentials are configured (common for a student project running
// locally), we log to the console instead of throwing — the rest of
// the app (in-app + Socket.IO notifications) still works fully.
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`[mailer:noop] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: 'SMTP not configured' };
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
    return { sent: true };
  } catch (e) {
    console.warn('[mailer] send failed:', e.message);
    return { sent: false, reason: e.message };
  }
}

module.exports = { sendMail };
