import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './components/Toast';
import Nav from './components/Nav';
import Home from './pages/Home';
import Listing from './pages/Listing';
import Login from './pages/Login';
import Register from './pages/Register';
import Owner from './pages/Owner';
import Institution from './pages/Institution';
import Admin from './pages/Admin';
import Community from './pages/Community';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <div className="wrap section"><p>Please <a href="/login" style={{ color: 'var(--teal)' }}>sign in</a> to view this page.</p></div>;
  if (user.role !== role) return <div className="wrap section"><p>This page is only available to {role.replace('_', ' ')} accounts.</p></div>;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listing/:id" element={<Listing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/community" element={<Community />} />
            <Route path="/owner" element={<RequireRole role="owner"><Owner /></RequireRole>} />
            <Route path="/institution" element={<RequireRole role="institution_admin"><Institution /></RequireRole>} />
            <Route path="/admin" element={<RequireRole role="system_admin"><Admin /></RequireRole>} />
          </Routes>
          <footer><div className="wrap">PGScout — a Computer Science &amp; Engineering project, Coimbatore Institute of Technology.</div></footer>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
