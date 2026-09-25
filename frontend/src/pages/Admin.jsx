import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Admin() {
  const showToast = useToast();
  const [pending, setPending] = useState([]);
  const [flags, setFlags] = useState([]);
  const [log, setLog] = useState([]);
  const [reveal, setReveal] = useState({});

  async function load() {
    const [p, f, l] = await Promise.all([api.pendingListings(), api.flags(), api.auditLog()]);
    setPending(p.listings || []);
    setFlags(f.flags || []);
    setLog(l.log || []);
  }
  useEffect(() => { load(); }, []);

  async function approve(id) { await api.approveListing(id); showToast('Listing approved.'); load(); }
  async function reject(id) { await api.rejectListing(id, 'Needs corrections before resubmission.'); showToast('Listing rejected.'); load(); }
  async function resolveFlag(id, action) { await api.resolveFlag(id, action); showToast(`Flag ${action}d.`); load(); }
  async function revealAuthor(postId) {
    try { const info = await api.truthCheck(postId); setReveal(r => ({ ...r, [postId]: info })); load(); }
    catch (e) { showToast(e.message); }
  }

  return (
    <div className="wrap section">
      <h2>System Admin console</h2>

      <div className="section-head" style={{ marginTop: 20 }}><h2 style={{ fontSize: 18 }}>Pending listing approvals</h2></div>
      <table className="datatable">
        <thead><tr><th>Listing</th><th>Owner</th><th>Area</th><th></th></tr></thead>
        <tbody>
          {pending.map(l => (
            <tr key={l.id}>
              <td>{l.name}</td><td>{l.owner_name} ({l.owner_email})</td><td>{l.area}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="btn small ghost" onClick={() => approve(l.id)}>Approve</button>
                <button className="btn small subtle" onClick={() => reject(l.id)}>Reject</button>
              </td>
            </tr>
          ))}
          {!pending.length && <tr><td colSpan={4} className="muted">Nothing pending.</td></tr>}
        </tbody>
      </table>

      <div className="section-head" style={{ marginTop: 30 }}><h2 style={{ fontSize: 18 }}>Flagged content</h2></div>
      <table className="datatable">
        <thead><tr><th>Type</th><th>Target ID</th><th>Reason</th><th></th></tr></thead>
        <tbody>
          {flags.map(f => (
            <tr key={f.id}>
              <td>{f.target_type}</td><td>{f.target_id}</td><td>{f.reason || '—'}</td>
              <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn small danger" onClick={() => resolveFlag(f.id, 'remove')}>Remove</button>
                <button className="btn small subtle" onClick={() => resolveFlag(f.id, 'dismiss')}>Dismiss</button>
                {f.target_type === 'post' && (
                  <button className="btn small ghost" onClick={() => revealAuthor(f.target_id)}>ITruthCheck: reveal author</button>
                )}
                {reveal[f.target_id] && <span className="muted">→ {reveal[f.target_id].name} ({reveal[f.target_id].email})</span>}
              </td>
            </tr>
          ))}
          {!flags.length && <tr><td colSpan={4} className="muted">No open flags.</td></tr>}
        </tbody>
      </table>

      <div className="section-head" style={{ marginTop: 30 }}><h2 style={{ fontSize: 18 }}>Audit log</h2></div>
      <table className="datatable">
        <thead><tr><th>When</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
        <tbody>
          {log.map(a => (
            <tr key={a.id}>
              <td>{new Date(a.created_at).toLocaleString()}</td>
              <td>{a.action}</td>
              <td>{a.target_type} #{a.target_id}</td>
              <td>{a.details || '—'}</td>
            </tr>
          ))}
          {!log.length && <tr><td colSpan={4} className="muted">No actions recorded yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
