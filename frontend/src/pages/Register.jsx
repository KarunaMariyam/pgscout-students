import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seeker', institution_name: '' });
  const [err, setErr] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try { await register(form); navigate('/'); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="wrap section">
      <h1>Create an account</h1>
      <form className="stack" onSubmit={submit}>
        <label>I am a...
          <select value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="seeker">Seeker (student / working professional) — free</option>
            <option value="owner">PG Owner</option>
            <option value="institution_admin">Institution Admin</option>
          </select>
        </label>
        <label>Full name<input value={form.name} onChange={e => set('name', e.target.value)} required /></label>
        <label>Email<input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></label>
        <label>Password<input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} /></label>
        {form.role === 'institution_admin' && (
          <label>Institution name<input value={form.institution_name} onChange={e => set('institution_name', e.target.value)} placeholder="e.g. CIT Coimbatore" required /></label>
        )}
        {err && <div className="error-text">{err}</div>}
        <button className="btn" type="submit">Create account</button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>Already have an account? <Link to="/login" style={{ color: 'var(--teal)' }}>Sign in</Link></p>
    </div>
  );
}
