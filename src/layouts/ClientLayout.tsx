import { Link, NavLink, Outlet } from 'react-router-dom';
import './ClientLayout.css';

export default function ClientLayout() {
  return (
    <div className="client-layout">
      <header className="client-header">
        <Link to="/" className="brand">
          rent<span>·</span>a<span>·</span>car
        </Link>
        <nav className="client-nav" aria-label="Principal">
          <NavLink to="/" end>Catálogo</NavLink>
          {/* "Mis arriendos" se agrega cuando exista login (JWT) */}
        </nav>
      </header>
      <main className="client-main">
        <Outlet />
      </main>
    </div>
  );
}