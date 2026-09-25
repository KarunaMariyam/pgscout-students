import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';

const emptyRoom = { type: 'Double', price: '', deposit: '', gender_pref: 'co' };

export default function Owner() {
  const showToast = useToast();
  const [listings, setListings] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [premium, setPremium] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', area: '', curfew_time: '', rules: '', amenities: '', rooms: [{ ...emptyRoom }] });
  const [err, setErr] = useState('');

  async function loadAll() {
    const [l, i, p] = await Promise.all([api.myListings(), api.ownerInbox(), api.premiumStatus()]);
    setListings(l.listings || []);
    setInbox(i.bookings || []);
    setPremium(p);
  }
  useEffect(() => { loadAll(); }, []);

  function updateRoom(idx, key, val) {
    setForm(f => { const rooms = [...f.rooms]; rooms[idx] = { ...rooms[idx], [key]: val }; return { ...f, rooms }; });
  }

  async function submitListing(e) {
    e.preventDefault();
    setErr('');
    if (!form.name || !form.address || !form.area || !form.rooms.every(r => r.price)) {
      setErr('Fill in property name, address, area, and a price for every room.');
      return;
    }
    try {
      await api.createListing({
        ...form,
        amenities: form.amenities.split(',').map(s => s.trim()).filter(Boolean),
        rooms: form.rooms.map(r => ({ ...r, price: Number(r.price), deposit: Number(r.deposit || r.price * 2) })),
      });
      showToast('Listing submitted — it will go live once a System Admin approves it.');
      setShowForm(false);
      setForm({ name: '', address: '', area: '', curfew_time: '', rules: '', amenities: '', rooms: [{ ...emptyRoom }] });
      loadAll();
    } catch (e) { setErr(e.message); }
  }

  async function respond(id, action) {
    try { await api.respondBooking(id, action); showToast(`Booking ${action}ed.`); loadAll(); }
    catch (e) { showToast(e.message); }
  }

  async function setRoomStatus(roomId, status) {
    try { await api.setRoomStatus(roomId, status); showToast('Room status updated.'); loadAll(); }
    catch (e) { showToast(e.message); }
  }

  async function upgradePremium() {
    try {
      const res = await api.premiumCheckout();
      showToast(res.mode === 'mock' ? res.message : 'Redirecting to Razorpay checkout…');
      loadAll();
    } catch (e) { showToast(e.message); }
  }

  const activeCount = listings.filter(l => l.status === 'approved').length;
  const pendingCount = listings.filter(l => l.status === 'pending').length;
  const newInquiries = inbox.filter(b => b.status === 'new').length;

  return (
    <div className="wrap section">
      <div className="section-head">
        <h2>Owner dashboard</h2>
        <button className="btn small" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New listing'}</button>
      </div>

      <div className="dash-grid">
        <div className="metric"><span>Active listings</span><b>{activeCount}</b></div>
        <div className="metric"><span>Pending approval</span><b>{pendingCount}</b></div>
        <div className="metric"><span>New inquiries</span><b>{newInquiries}</b></div>
        <div className="metric"><span>Premium</span><b style={{ fontSize: 18, textTransform: 'capitalize' }}>{premium?.status || 'inactive'}</b></div>
      </div>

      {premium?.status !== 'active' && (
        <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Upgrade to Premium for better listing visibility. This is an owner-only paid tier — Seekers never pay PGScout.</span>
          <button className="btn small" onClick={upgradePremium}>Upgrade — ₹499/mo</button>
        </div>
      )}

      {showForm && (
        <form className="stack" style={{ maxWidth: 560, marginBottom: 30 }} onSubmit={submitListing}>
          <label>Property name<input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
          <label>Address<input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" /></label>
          <label>Area<input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Peelamedu, Coimbatore" /></label>
          <label>Curfew time<input value={form.curfew_time} onChange={e => setForm(f => ({ ...f, curfew_time: e.target.value }))} placeholder="e.g. 10:00 PM" /></label>
          <label>House rules<textarea value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} /></label>
          <label>Amenities (comma separated)<input value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="Wi-Fi, Food included, AC" /></label>

          <p style={{ fontWeight: 500, margin: '4px 0 0' }}>Rooms</p>
          {form.rooms.map((r, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={r.type} onChange={e => updateRoom(idx, 'type', e.target.value)}>
                <option>Single</option><option>Double</option><option>Triple</option>
              </select>
              <input type="number" placeholder="Rent ₹" value={r.price} onChange={e => updateRoom(idx, 'price', e.target.value)} style={{ width: 100 }} />
              <input type="number" placeholder="Deposit ₹" value={r.deposit} onChange={e => updateRoom(idx, 'deposit', e.target.value)} style={{ width: 110 }} />
              <select value={r.gender_pref} onChange={e => updateRoom(idx, 'gender_pref', e.target.value)}>
                <option value="boys">Boys</option><option value="girls">Girls</option><option value="co">Co-living</option>
              </select>
            </div>
          ))}
          <button type="button" className="btn subtle small" style={{ alignSelf: 'flex-start' }}
            onClick={() => setForm(f => ({ ...f, rooms: [...f.rooms, { ...emptyRoom }] }))}>+ Add another room</button>

          {err && <div className="error-text">{err}</div>}
          <button className="btn" type="submit">Submit for approval</button>
        </form>
      )}

      <div className="section-head"><h2 style={{ fontSize: 18 }}>Your listings</h2></div>
      <table className="datatable">
        <thead><tr><th>Listing</th><th>Status</th><th>Rooms</th><th>Rating</th></tr></thead>
        <tbody>
          {listings.map(l => (
            <tr key={l.id}>
              <td>{l.name}</td>
              <td><span className={`status-pill ${l.status === 'approved' ? 'accepted' : l.status === 'pending' ? 'pending' : 'declined'}`}>{l.status}</span></td>
              <td>
                {l.rooms.map(r => (
                  <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span className={`status-pill ${r.status}`}>{r.type}: {r.status}</span>
                    {r.status !== 'maintenance'
                      ? <button className="btn subtle small" onClick={() => setRoomStatus(r.id, 'maintenance')}>Mark maintenance</button>
                      : <button className="btn subtle small" onClick={() => setRoomStatus(r.id, 'available')}>Mark available</button>}
                  </div>
                ))}
              </td>
              <td>{l.avg_rating ? Number(l.avg_rating).toFixed(1) + ' ★' : '—'}</td>
            </tr>
          ))}
          {!listings.length && <tr><td colSpan={4} className="muted">No listings yet — create your first one above.</td></tr>}
        </tbody>
      </table>

      <div className="section-head" style={{ marginTop: 30 }}><h2 style={{ fontSize: 18 }}>Booking inquiries</h2></div>
      <table className="datatable">
        <thead><tr><th>Seeker</th><th>Listing</th><th>Move-in</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {inbox.map(b => (
            <tr key={b.id}>
              <td>{b.seeker_name}</td>
              <td>{b.listing_name}</td>
              <td>{b.move_in_date}</td>
              <td><span className={`status-pill ${b.status}`}>{b.status}</span></td>
              <td>
                {(b.status === 'new' || b.status === 'pending') && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn small ghost" onClick={() => respond(b.id, 'accept')}>Accept</button>
                    <button className="btn small subtle" onClick={() => respond(b.id, 'decline')}>Decline</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {!inbox.length && <tr><td colSpan={5} className="muted">No inquiries yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
