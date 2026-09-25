// REQ-SRC (distance search) + Section 2.5: OpenStreetMap / Nominatim geocoding.
// Free, no API key — but Nominatim's usage policy requires a real User-Agent
// and a max of ~1 request/second. If the network call fails for any reason
// (offline dev machine, rate limit, no internet), we fail soft and return
// null coordinates rather than blocking listing creation — reliability over
// a hard dependency on a third-party service.
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'PGScout-Student-Project/1.0' },
    });
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    if (!data || !data[0]) return { lat: null, lng: null };
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.warn('[geocode] Nominatim lookup failed, continuing without coordinates:', e.message);
    return { lat: null, lng: null };
  }
}

// Haversine distance in km between two lat/lng points.
function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { geocodeAddress, distanceKm };
