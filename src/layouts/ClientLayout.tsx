import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ClientLayout.css';

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="client-layout">
      <header className="client-header">
        <Link to="/" className="brand">
          rent<span>·</span>a<span>·</span>car
        </Link>
        <nav className="client-nav" aria-label="Principal">
          <NavLink to="/" end>Catálogo</NavLink>
          {user && <NavLink to="/mis-arriendos">Mis arriendos</NavLink>}
        </nav>

        <div className="client-session">
          {!user && <Link to="/login" className="client-session__link">Ingresar</Link>}
          {user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE') && (
            <Link to="/admin/arriendos" className="client-session__link">Backoffice</Link>
          )}
          {user && (
            <button type="button" className="client-session__link client-session__logout" onClick={handleLogout}>
              Salir ({user.firstName})
            </button>
          )}
        </div>
      </header>
      <main className="client-main">
        <Outlet />
      </main>
      <footer className="client-footer">
        Fotos proporcionadas por <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
      </footer>
    </div>
  );
}