import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';

export default function Listing() {
  const { id } = useParams();
  const { user } = useAuth();
  const showToast = useToast();
  const [listing, setListing] = useState(null);
  const [tab, setTab] = useState('rooms');
  const [moveIn, setMoveIn] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [err, setErr] = useState('');
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [myBookingId, setMyBookingId] = useState('');

  async function load() {
    const data = await api.listing(id);
    setListing(data);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!listing) return <div className="wrap section"><p className="muted">Loading…</p></div>;

  async function sendBooking(e) {
    e.preventDefault();
    setErr('');
    if (!user) { setErr('Sign in as a Seeker to send a booking request.'); return; }
    if (!selectedRoom || !moveIn) { setErr('Pick a room and a move-in date.'); return; }
    try {
      await api.book({ roomId: selectedRoom, moveInDate: moveIn, message });
      showToast('Booking request sent to the owner.');
      setMoveIn(''); setMessage(''); setSelectedRoom(null);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function joinWaitlist(roomId) {
    try { await api.joinWaitlist(roomId); showToast('Added to the waitlist — you will be notified when a room opens up.'); load(); }
    catch (e) { setErr(e.message); }
  }

  async function submitReview(e) {
    e.preventDefault();
    setErr('');
    if (!reviewStars || !myBookingId) { setErr('Enter your booking ID and pick a star rating.'); return; }
    try {
      await api.submitReview({ bookingId: Number(myBookingId), stars: reviewStars, text: reviewText });
      showToast('Review posted — thanks for helping other Seekers.');
      setReviewStars(0); setReviewText(''); setMyBookingId('');
      load();
    } catch (e) { setErr(e.message); }
  }

  async function flagReview(rid) {
    await api.flagReview(rid, 'Reported by a user');
    showToast('Review flagged for moderation.');
  }

  return (
    <div className="wrap section">
      <div className="row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: '0 0 4px' }}>{listing.name}</h1>
          <p className="muted" style={{ margin: 0 }}>{listing.area}{listing.distance_km != null ? ` · ${listing.distance_km.toFixed(1)} km from CIT` : ''}</p>
        </div>
        {listing.avg_rating && <div className="rating" style={{ fontSize: 16 }}>★ {Number(listing.avg_rating).toFixed(1)} · {listing.review_count} reviews</div>}
      </div>

      <div className="dash-grid" style={{ marginTop: 16 }}>
        <div className="metric"><span>Curfew</span><b style={{ fontSize: 16 }}>{listing.curfew_time || '—'}</b></div>
        <div className="metric"><span>Amenities</span><b style={{ fontSize: 16 }}>{listing.amenities?.length || 0}</b></div>
        <div className="metric"><span>Rooms</span><b style={{ fontSize: 16 }}>{listing.rooms?.length || 0}</b></div>
        <div className="metric"><span>Status</span><b style={{ fontSize: 16, textTransform: 'capitalize' }}>{listing.status}</b></div>
      </div>

      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(listing.amenities || []).map(a => <span key={a} className="badge co" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>{a}</span>)}
      </p>
      {listing.rules && <p className="muted">{listing.rules}</p>}

      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--line)', margin: '20px 0 16px' }}>
        {['rooms', 'book', 'reviews'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: 'none', border: 'none', padding: '9px 2px', marginBottom: -1, fontSize: 14,
              color: tab === t ? 'var(--ink)' : 'var(--ink-soft)', borderBottom: tab === t ? '2px solid var(--teal)' : '2px solid transparent', fontWeight: tab === t ? 500 : 400 }}>
            {t === 'rooms' ? 'Room availability' : t === 'book' ? 'Send inquiry' : `Reviews (${listing.reviews?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'rooms' && (
        <div>
          {(listing.rooms || []).map(r => (
            <div className="roomrow" key={r.id}>
              <div>
                <b>{r.type}</b> · ₹{Number(r.price).toLocaleString('en-IN')}/mo · deposit ₹{Number(r.deposit).toLocaleString('en-IN')}
                <span className={`badge ${r.gender_pref}`} style={{ marginLeft: 8 }}>{r.gender_pref === 'boys' ? 'Boys' : r.gender_pref === 'girls' ? 'Girls' : 'Co-living'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`status-pill ${r.status}`}>{r.status}</span>
                {r.status === 'available' && <button className="btn small" onClick={() => { setSelectedRoom(r.id); setTab('book'); }}>Book this room</button>}
                {['reserved', 'occupied', 'waitlisted'].includes(r.status) && <button className="btn small subtle" onClick={() => joinWaitlist(r.id)}>Join waitlist</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'book' && (
        <form className="stack" onSubmit={sendBooking}>
          <label>Room
            <select value={selectedRoom || ''} onChange={e => setSelectedRoom(Number(e.target.value))}>
              <option value="">Select a room</option>
              {(listing.rooms || []).filter(r => r.status === 'available').map(r => (
                <option key={r.id} value={r.id}>{r.type} · ₹{r.price}/mo ({r.gender_pref})</option>
              ))}
            </select>
          </label>
          <label>Preferred move-in date<input type="date" value={moveIn} onChange={e => setMoveIn(e.target.value)} /></label>
          <label>Message to owner (optional)<textarea value={message} onChange={e => setMessage(e.target.value)} /></label>
          {err && <div className="error-text">{err}</div>}
          <button className="btn" type="submit">Send inquiry</button>
          <p className="disclaimer">PGScout does not independently verify the physical safety or legal compliance of listed properties. Please visit in person before finalizing any payment.</p>
        </form>
      )}

      {tab === 'reviews' && (
        <div>
          {(listing.reviews || []).length === 0 && <p className="muted">No reviews yet.</p>}
          {(listing.reviews || []).map(rv => (
            <div className="review" key={rv.id}>
              <div className="row"><b>{rv.seeker_name}</b><span className="stars">{'★'.repeat(rv.stars)}{'☆'.repeat(5 - rv.stars)}</span></div>
              <p style={{ margin: '4px 0' }}>{rv.text}</p>
              {rv.status === 'flagged' && <span className="muted">(flagged, pending moderation)</span>}
              <button className="btn subtle small" onClick={() => flagReview(rv.id)}>Flag</button>
              {rv.response && <div className="owner-reply"><b>Owner response</b>{rv.response.text}</div>}
            </div>
          ))}
          {user?.role === 'seeker' && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 500, marginBottom: 8 }}>Leave a review for a completed, accepted booking</p>
              <form className="stack" onSubmit={submitReview}>
                <label>Your booking ID<input type="number" value={myBookingId} onChange={e => setMyBookingId(e.target.value)} placeholder="See it on your bookings list" /></label>
                <div style={{ display: 'flex', gap: 6, fontSize: 22 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} onClick={() => setReviewStars(n)} style={{ cursor: 'pointer', color: n <= reviewStars ? 'var(--amber)' : 'var(--line-strong)' }}>★</span>
                  ))}
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="How was your stay?" />
                {err && <div className="error-text">{err}</div>}
                <button className="btn small" style={{ alignSelf: 'flex-start' }} type="submit">Post review</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
