import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth';
import './LoginPage.css';

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin/flota',
  EMPLOYEE: '/admin/arriendos',
  CLIENT: '/',
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (authUser) => {
      login(authUser);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? HOME_BY_ROLE[authUser.role], { replace: true });
    },
  });

  // Ya hay sesión: no tiene sentido mostrar el login de nuevo
  if (user) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div className="login">
      <section className="login__band">
        {/* Decoración: líneas de velocidad del logo y silueta del auto */}
        <div className="login__lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <svg className="login__bg-car" viewBox="0 0 120 56" fill="none" stroke="currentColor"
          strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 40V31c0-4 3-7 9-8l19-3 13-10c2-1 5-2 8-2h22c4 0 7 1 10 4l10 8 9 2c5 1 8 4 8 8v10" />
          <path d="M8 40h12M44 40h34M102 40h10" />
          <circle cx="32" cy="40" r="10" />
          <circle cx="90" cy="40" r="10" />
          <path d="M42 20l10-9h14v9zM72 20v-9h12l10 9z" />
        </svg>

        <header className="login__header">
          <Link to="/" className="login__brand">
            <svg width="32" height="23" viewBox="0 0 34 24" fill="none" stroke="currentColor"
              strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3h22M3 12h27M6 21h22" />
            </svg>
            <span>Rent<span className="login__brand-a">A</span>Car</span>
          </Link>
          <Link to="/" className="login__back">← Volver al catálogo</Link>
        </header>

        <div className="login__intro">
          <h1>
            Arrienda el auto justo, <span>sin vueltas.</span>
          </h1>
          <p>Revisa la flota disponible, elige tus fechas y conoce el total antes de confirmar.</p>
        </div>
      </section>

      <main className="login__main">
        <div className="login__card">
          <nav className="login__tabs" aria-label="Acceso">
            <span className="login__tab" aria-current="page">Ingresar</span>
            <Link to="/registro" className="login__tab">Crear cuenta</Link>
          </nav>

          <form className="login__form" onSubmit={submit}>
            <div>
              <h2>Iniciar sesión</h2>
              <p>Ingresa con tu cuenta para continuar.</p>
            </div>

            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tu@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mutation.isError && (
              <p className="login__error" role="alert">{mutation.error.message}</p>
            )}

            <button type="submit" className="btn-amber login__submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}