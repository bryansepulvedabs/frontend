import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './BackofficeLayout.css';

const ROLE_LABELS = { ADMIN: 'ADMIN', EMPLOYEE: 'EMPLEADO', CLIENT: 'CLIENTE' } as const;

export default function BackofficeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null; // ProtectedRoute ya redirige; esto evita un parpadeo

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="backoffice">
      <aside className="backoffice__sidebar">
          <div className="backoffice__brand">
            <span className="backoffice__brand-name">Rent<span>A</span>Car</span>
            <span className="backoffice__brand-tag">Admin</span>
          </div>

        <nav className="backoffice__nav">
          <span className="backoffice__nav-group">Operación</span>
          <NavLink to="/admin/arriendos" className="backoffice__nav-link">Arriendos</NavLink>

          {user.role === 'ADMIN' && (
            <>
              <span className="backoffice__nav-group">Administración</span>
              <NavLink to="/admin/flota" className="backoffice__nav-link">Flota</NavLink>
              <NavLink to="/admin/usuarios" className="backoffice__nav-link">Usuarios</NavLink>
            </>
          )}
        </nav>

        <div className="backoffice__user">
          <div className="backoffice__avatar">{initials}</div>
          <div>
            <p className="backoffice__user-name">{user.firstName} {user.lastName}</p>
            <p className="backoffice__user-role">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button type="button" className="backoffice__logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="backoffice__main">
        <Outlet />
      </main>
    </div>
  );
}