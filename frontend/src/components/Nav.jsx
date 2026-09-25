import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site">
      <div className="wrap headbar">
        <NavLink to="/" className="logo"><span>PGScout</span><span className="dot">.</span></NavLink>
        <nav className="mainnav">
          <NavLink to="/" end>Search</NavLink>
          <NavLink to="/community">Community</NavLink>
          {user?.role === 'owner' && <NavLink to="/owner">Owner dashboard</NavLink>}
          {user?.role === 'institution_admin' && <NavLink to="/institution">Institution</NavLink>}
          {user?.role === 'system_admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <span className="userchip">
              {user.name} · {user.role.replace('_', ' ')}
              <button className="btn subtle small" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
            </span>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink to="/register" className="btn small" style={{ color: '#fff' }}>Get started</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
