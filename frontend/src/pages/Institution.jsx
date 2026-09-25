import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Institution() {
  const showToast = useToast();
  const [listings, setListings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [radius, setRadius] = useState(4);

  async function load() {
    const [l, a] = await Promise.all([api.nearbyListings(radius), api.institutionAnalytics(radius)]);
    setListings(l.listings || []);
    setAnalytics(a);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [radius]);

  async function toggle(id) {
    try { await api.toggleRecommend(id); showToast('Recommendation updated.'); load(); }
    catch (e) { showToast(e.message); }
  }

  return (
    <div className="wrap section">
      <div className="section-head">
        <h2>Institution dashboard</h2>
        <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Radius (km)
          <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value) || 4)} style={{ width: 60, padding: 6, borderRadius: 6, border: '1px solid var(--line)' }} />
        </label>
      </div>

      <div className="dash-grid">
        <div className="metric"><span>Listings nearby</span><b>{analytics?.listingsNearby ?? '—'}</b></div>
        <div className="metric"><span>Recommended</span><b>{analytics?.recommended ?? '—'}</b></div>
        <div className="metric"><span>Average rating nearby</span><b>{analytics?.avgRating ? Number(analytics.avgRating).toFixed(1) : '—'}</b></div>
        <div className="metric"><span>Flagged reviews</span><b>{analytics?.flaggedReviews ?? 0}</b></div>
      </div>

      <table className="datatable">
        <thead><tr><th>Listing</th><th>Area</th><th>Distance</th><th>Rating</th><th>Flagged</th><th>Recommended</th></tr></thead>
        <tbody>
          {listings.map(l => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td>{l.area}</td>
              <td>{l.distance_km?.toFixed(1)} km</td>
              <td>{l.avg_rating ? Number(l.avg_rating).toFixed(1) + ' ★' : '—'}</td>
              <td>{l.flagged_count}</td>
              <td><button className={`btn small ${l.recommended ? 'ghost' : 'subtle'}`} onClick={() => toggle(l.id)}>{l.recommended ? 'Recommended ✓' : 'Mark recommended'}</button></td>
            </tr>
          ))}
          {!listings.length && <tr><td colSpan={6} className="muted">No approved listings within this radius yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
