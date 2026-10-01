import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ClientLayout.css';

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // La landing lleva un banner a todo el ancho; el resto de las páginas siguen contenidas.
  const isHome = pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="client-layout">
      <header className="client-header">
        <div className="client-header__inner">
          <Link to="/" className="brand">
            <svg width="30" height="22" viewBox="0 0 34 24" fill="none" stroke="currentColor"
              strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3h22M3 12h27M6 21h22" />
            </svg>
            <span>Rent<span className="brand__a">A</span>Car</span>
          </Link>

          <nav className="client-nav" aria-label="Principal">
            <NavLink to="/#catalogo" end>Catálogo</NavLink>
            {user && <NavLink to="/mis-arriendos">Mis arriendos</NavLink>}
            {user && <NavLink to="/mi-perfil">Mi perfil</NavLink>}
          </nav>

          <div className="client-session">
            {user && (user.role === 'ADMIN' || user.role === 'EMPLOYEE') && (
              <Link to="/admin/arriendos" className="client-session__link">Backoffice</Link>
            )}
            {user && (
              <button type="button" className="client-session__link client-session__logout" onClick={handleLogout}>
                Salir ({user.firstName})
              </button>
            )}
            {!user && <Link to="/login" className="client-session__login">Ingresar</Link>}
          </div>
        </div>
      </header>

      <main className={isHome ? 'client-main client-main--full' : 'client-main'}>
        <Outlet />
      </main>

      <footer className="client-footer">
        Fotos proporcionadas por <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
      </footer>
    </div>
  );
}