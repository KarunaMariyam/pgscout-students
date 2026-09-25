// Holds the Socket.IO instance so route files can emit without circular imports.
let io = null;

function init(serverIo) {
  io = serverIo;
}

// Emits a real-time event to one user's private room ("user:<id>"), and
// always also writes a persistent notification row via the caller —
// this function only handles the live push (REQ-NOT-01/02, Socket.IO
// channel from the deployment diagram).
function notifyUser(userId, payload) {
  if (io) io.to(`user:${userId}`).emit('notification', payload);
}

module.exports = { init, notifyUser };
