import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth';

interface Props {
  allow: Role[];
  redirectTo?: string;
  children: ReactNode;
}

export default function ProtectedRoute({ allow, redirectTo = '/', children }: Props) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Guarda la ruta actual para volver aquí apenas inicie sesión
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!allow.includes(user.role)) {
    // Sesión válida pero sin permiso para esta sección
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}