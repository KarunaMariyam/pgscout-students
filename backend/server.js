require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const socketHolder = require('./src/socket');
const authRoutes = require('./src/routes/auth');
const listingsRoutes = require('./src/routes/listings');
const { router: bookingsRoutes, sweepExpiredReservations } = require('./src/routes/bookings');
const reviewsRoutes = require('./src/routes/reviews');
const communityRoutes = require('./src/routes/community');
const institutionRoutes = require('./src/routes/institution');
const adminRoutes = require('./src/routes/admin');
const premiumRoutes = require('./src/routes/premium');
const notificationsRoutes = require('./src/routes/notifications');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'pgscout-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/notifications', notificationsRoutes);

// Fallback error handler so an unexpected error returns JSON, not an HTML stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || '*' } });

// Authenticate each socket with the same JWT used for REST calls, then
// join a private per-user room so notify() can target exactly one user.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // allow anonymous connections (e.g. public search page)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (e) {
    next(); // invalid token: connect anonymously rather than hard-failing the socket
  }
});
io.on('connection', (socket) => {
  if (socket.user) socket.join(`user:${socket.user.id}`);
});
socketHolder.init(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`PGScout backend listening on port ${PORT}`);
  // REQ-BKG-04: sweep for 24-hour-expired reservations every 5 minutes.
  setInterval(sweepExpiredReservations, 5 * 60 * 1000);
});
