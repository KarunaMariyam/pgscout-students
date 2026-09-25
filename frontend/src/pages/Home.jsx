import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const COLORS = ['#1F6F5C', '#A6503A', '#C9821F', '#3B5B7A', '#6B5B8E', '#4E7A3C'];
function colorFor(seed) { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function minPrice(rooms) { return rooms && rooms.length ? Math.min(...rooms.map(r => Number(r.price))) : null; }

export default function Home() {
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [amenity, setAmenity] = useState('');
  const [sort, setSort] = useState('distance');
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function runSearch() {
    setLoading(true);
    try {
      const params = { sort };
      if (q) params.q = q;
      if (gender) params.gender = gender;
      if (maxRent) params.maxRent = maxRent;
      if (amenity) params.amenity = amenity;
      const data = await api.search(params);
      setListings(data.listings || []);
      setMessage(data.message || '');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="hero">
        <div className="wrap">
          <h1>Find a PG near college without the guesswork.</h1>
          <p>Verified listings, real tenant reviews, and a straight line to the owner — searched by students, for students.</p>
          <div className="searchbar">
            <input type="text" placeholder='Search by area or college — try "Peelamedu"' value={q}
              onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="distance">Sort: distance</option>
              <option value="price">Sort: price</option>
              <option value="rating">Sort: rating</option>
            </select>
            <button className="btn" onClick={runSearch}>Search</button>
          </div>
        </div>
      </div>

      <div className="wrap section">
        <div className="section-head">
          <h2>PG listings</h2>
          <span className="muted">{listings.length} result{listings.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <select value={gender} onChange={e => { setGender(e.target.value); }}>
            <option value="">All genders</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
            <option value="co">Co-living</option>
          </select>
          <input type="number" placeholder="Max rent ₹" value={maxRent} onChange={e => setMaxRent(e.target.value)} style={{ width: 120, padding: 8, borderRadius: 7, border: '1px solid var(--line)' }} />
          <select value={amenity} onChange={e => setAmenity(e.target.value)}>
            <option value="">Any amenity</option>
            <option>Wi-Fi</option><option>Food included</option><option>AC</option><option>Laundry</option><option>Attached bathroom</option>
          </select>
          <button className="btn subtle small" onClick={runSearch}>Apply filters</button>
        </div>

        {loading ? <p className="muted">Loading listings…</p> : (
          <div className="grid">
            {listings.length === 0 && <div className="empty"><b>No listings match yet</b>{message || 'Try relaxing a filter.'}</div>}
            {listings.map(l => {
              const price = minPrice(l.rooms);
              return (
                <Link to={`/listing/${l.id}`} className="card" key={l.id} style={{ color: 'inherit' }}>
                  <div className="thumb" style={{ background: colorFor(l.name) }}>{l.name}</div>
                  <div className="body">
                    <div className="row"><span className="name">{l.name}</span>{!!l.recommended && <span className="rec-badge">Institution pick</span>}</div>
                    <div className="area">{l.area}{l.distance_km != null ? ` · ${l.distance_km.toFixed(1)} km from CIT` : ''}</div>
                    <div className="row">
                      <div className="price">{price != null ? `₹${price.toLocaleString('en-IN')}` : '—'}<small>/mo</small></div>
                      <div className="rating">{l.avg_rating ? `★ ${Number(l.avg_rating).toFixed(1)}` : 'New'}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
