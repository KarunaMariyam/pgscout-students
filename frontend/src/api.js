const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('pgscout_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  base: BASE,
  // auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),
  // listings
  search: (params) => request(`/api/listings?${new URLSearchParams(params).toString()}`, { auth: false }),
  listing: (id) => request(`/api/listings/${id}`, { auth: false }),
  createListing: (payload) => request('/api/listings', { method: 'POST', body: payload }),
  myListings: () => request('/api/listings/mine/owner'),
  setRoomStatus: (roomId, status) => request(`/api/listings/rooms/${roomId}/status`, { method: 'PATCH', body: { status } }),
  // bookings
  book: (payload) => request('/api/bookings', { method: 'POST', body: payload }),
  respondBooking: (id, action) => request(`/api/bookings/${id}`, { method: 'PATCH', body: { action } }),
  joinWaitlist: (roomId) => request(`/api/bookings/rooms/${roomId}/waitlist`, { method: 'POST' }),
  myBookings: () => request('/api/bookings/mine'),
  ownerInbox: () => request('/api/bookings/owner/inbox'),
  // reviews
  submitReview: (payload) => request('/api/reviews', { method: 'POST', body: payload }),
  respondReview: (id, text) => request(`/api/reviews/${id}/response`, { method: 'POST', body: { text } }),
  flagReview: (id, reason) => request(`/api/reviews/${id}/flag`, { method: 'POST', body: { reason } }),
  // community
  communityFeed: () => request('/api/community', { auth: false }),
  createPost: (text) => request('/api/community', { method: 'POST', body: { text } }),
  replyPost: (id, text) => request(`/api/community/${id}/reply`, { method: 'POST', body: { text } }),
  flagPost: (id, reason) => request(`/api/community/${id}/flag`, { method: 'POST', body: { reason } }),
  // institution
  nearbyListings: (radius) => request(`/api/institution/listings?radius=${radius || 4}`),
  toggleRecommend: (listingId) => request(`/api/institution/recommend/${listingId}`, { method: 'POST' }),
  institutionAnalytics: (radius) => request(`/api/institution/analytics?radius=${radius || 4}`),
  // admin
  pendingListings: () => request('/api/admin/pending-listings'),
  approveListing: (id) => request(`/api/admin/listings/${id}/approve`, { method: 'PATCH' }),
  rejectListing: (id, reason) => request(`/api/admin/listings/${id}/reject`, { method: 'PATCH', body: { reason } }),
  flags: () => request('/api/admin/flags'),
  resolveFlag: (id, action) => request(`/api/admin/flags/${id}/resolve`, { method: 'PATCH', body: { action } }),
  suspendUser: (id, suspend) => request(`/api/admin/users/${id}/suspend`, { method: 'PATCH', body: { suspend } }),
  truthCheck: (postId) => request(`/api/admin/community/${postId}/author`),
  auditLog: () => request('/api/admin/audit-log'),
  // premium
  premiumCheckout: () => request('/api/premium/checkout', { method: 'POST' }),
  premiumStatus: () => request('/api/premium/status'),
  // notifications
  notifications: () => request('/api/notifications'),
  markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};

export function saveSession(token, user) {
  localStorage.setItem('pgscout_token', token);
  localStorage.setItem('pgscout_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('pgscout_token');
  localStorage.removeItem('pgscout_user');
}
export function getUser() {
  const raw = localStorage.getItem('pgscout_user');
  return raw ? JSON.parse(raw) : null;
}
export { getToken };
