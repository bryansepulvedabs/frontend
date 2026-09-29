import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
      <section className="login__hero">
        <div className="login__brand">
          rent<span>·</span>a<span>·</span>car
        </div>
        <div className="login__hero-body">
          <svg width="220" height="96" viewBox="0 0 120 56" fill="none" stroke="#E0703F"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 40V31c0-4 3-7 9-8l19-3 13-10c2-1 5-2 8-2h22c4 0 7 1 10 4l10 8 9 2c5 1 8 4 8 8v10" />
            <path d="M8 40h12M44 40h34M102 40h10" />
            <circle cx="32" cy="40" r="10" />
            <circle cx="90" cy="40" r="10" />
            <path d="M42 20l10-9h14v9zM72 20v-9h12l10 9z" />
          </svg>
          <h1>Arrienda el auto justo, sin vueltas.</h1>
          <p>Revisa la flota disponible, elige tus fechas y conoce el total antes de confirmar.</p>
        </div>
        <div className="login__hero-foot">Proyecto rent-a-car · microservicios Spring Boot</div>
      </section>

      <section className="login__form-wrap">
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

          <button type="submit" className="btn-primary login__submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  );
}