const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// REQ-PRM-01: Owner-only, opt-in paid tier. Seekers are never billed anywhere in this API.
router.post('/checkout', requireAuth, requireRole('owner'), async (req, res) => {
  const amountPaise = 49900; // ₹499/month demo price — see SRS Appendix C TBD #3 for final pricing.
  try {
    if (razorpay) {
      const order = await razorpay.orders.create({ amount: amountPaise, currency: 'INR', receipt: `owner_${req.user.id}_${Date.now()}` });
      await pool.query(
        'INSERT INTO subscriptions (owner_id, status, razorpay_order_id) VALUES (?, \'inactive\', ?)',
        [req.user.id, order.id]
      );
      return res.json({ mode: 'razorpay', order, keyId: process.env.RAZORPAY_KEY_ID });
    }
    // No Razorpay keys configured: activate instantly so the demo works
    // end-to-end without a real payment account (documented fallback).
    await pool.query(
      "INSERT INTO subscriptions (owner_id, status, current_period_end) VALUES (?, 'active', DATE_ADD(CURDATE(), INTERVAL 30 DAY))",
      [req.user.id]
    );
    res.json({ mode: 'mock', activated: true, message: 'Razorpay is not configured in this environment, so Premium was activated directly for the demo.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not start checkout.' });
  }
});

// REQ-PRM-02: activate/renew only on a verified payment_success webhook.
router.post('/webhook', express.json(), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(400).json({ error: 'Webhook not configured.' });
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (signature !== expected) return res.status(400).json({ error: 'Invalid webhook signature.' });

  const orderId = req.body?.payload?.payment?.entity?.order_id;
  const paymentId = req.body?.payload?.payment?.entity?.id;
  if (orderId) {
    await pool.query(
      "UPDATE subscriptions SET status='active', razorpay_payment_id=?, current_period_end = DATE_ADD(CURDATE(), INTERVAL 30 DAY) WHERE razorpay_order_id = ?",
      [paymentId, orderId]
    );
  }
  res.json({ received: true });
});

router.get('/status', requireAuth, requireRole('owner'), async (req, res) => {
  const [[sub]] = await pool.query('SELECT * FROM subscriptions WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
  res.json(sub || { status: 'inactive' });
});

// REQ-PRM-03: billing history.
router.get('/history', requireAuth, requireRole('owner'), async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM subscriptions WHERE owner_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ history: rows });
});

module.exports = router;
