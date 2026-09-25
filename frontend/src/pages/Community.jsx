import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';

export default function Community() {
  const { user } = useAuth();
  const showToast = useToast();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState({});
  const [err, setErr] = useState('');

  async function load() {
    const data = await api.communityFeed();
    setPosts(data.posts || []);
  }
  useEffect(() => { load(); }, []);

  async function post(e) {
    e.preventDefault();
    setErr('');
    if (!user) { setErr('Sign in as a Seeker to post.'); return; }
    try { await api.createPost(text); setText(''); showToast('Posted anonymously.'); load(); }
    catch (e) { setErr(e.message); }
  }

  async function reply(id) {
    const t = replyText[id];
    if (!t) return;
    try { await api.replyPost(id, t); setReplyText(r => ({ ...r, [id]: '' })); showToast('Reply posted with your Owner badge.'); load(); }
    catch (e) { showToast(e.message); }
  }

  async function flag(id) {
    await api.flagPost(id, 'Reported by a user');
    showToast('Post flagged for moderation.');
    load();
  }

  return (
    <div className="wrap section">
      <h2>Community</h2>
      <p className="muted" style={{ maxWidth: 560 }}>Post anonymously — other Seekers never see who wrote it. PG Owners can reply with a visible Owner badge. Abusive posts can be flagged for moderation.</p>

      {user?.role === 'seeker' && (
        <form className="stack" onSubmit={post} style={{ marginBottom: 24 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ask about an area, share a tip, or vent — your name stays hidden." />
          {err && <div className="error-text">{err}</div>}
          <button className="btn small" style={{ alignSelf: 'flex-start' }} type="submit">Post anonymously</button>
        </form>
      )}

      {posts.map(p => (
        <div className="post" key={p.id}>
          <div className="meta">Anonymous Seeker · {new Date(p.created_at).toLocaleDateString()} {p.status === 'flagged' && '· flagged, pending moderation'}</div>
          <p style={{ margin: '4px 0' }}>{p.text}</p>
          {p.replies.map((r, i) => (
            <div className="reply" key={i}><b>{r.owner_name} (Owner)</b> — {r.text}</div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn subtle small" onClick={() => flag(p.id)}>Flag</button>
          </div>
          {user?.role === 'owner' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}
                value={replyText[p.id] || ''} onChange={e => setReplyText(r => ({ ...r, [p.id]: e.target.value }))} placeholder="Reply as owner..." />
              <button className="btn small" onClick={() => reply(p.id)}>Reply</button>
            </div>
          )}
        </div>
      ))}
      {!posts.length && <p className="muted">No community posts yet.</p>}
    </div>
  );
}
