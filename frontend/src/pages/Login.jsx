import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try { await login(email, password); navigate('/'); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="wrap section">
      <h1>Sign in</h1>
      <form className="stack" onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {err && <div className="error-text">{err}</div>}
        <button className="btn" type="submit">Sign in</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        No account? <Link to="/register" style={{ color: 'var(--teal)' }}>Register</Link>
      </p>
      <p className="muted" style={{ marginTop: 24, maxWidth: 420 }}>
        Demo logins (password <code>password123</code>): anand.owner@example.com (Owner),
        vignesh.seeker@example.com (Seeker), institution.admin@example.com (Institution Admin), admin@example.com (System Admin).
      </p>
    </div>
  );
}
