import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { registerUser } from '../api/users';
import type { RegisterRequest } from '../api/users';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './RegisterPage.css';

const EMPTY_FORM: RegisterRequest = {
  rut: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  city: '',
  country: 'Chile',
};

export default function RegisterPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterRequest>(EMPTY_FORM);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Registro + login en una sola acción: no tiene sentido hacer escribir la clave
  // dos veces. El backend fuerza el rol CLIENT, así que el formulario no lo pide.
  const mutation = useMutation({
    mutationFn: async (dto: RegisterRequest) => {
      await registerUser(dto);
      return loginRequest({ email: dto.email, password: dto.password });
    },
    onSuccess: (authUser) => {
      login(authUser);
      navigate('/', { replace: true });
    },
  });

  // Ya hay sesión: no tiene sentido mostrar el registro
  if (user) {
    return <Navigate to="/" replace />;
  }

  const set = (field: keyof RegisterRequest) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    setLocalError(null);
    mutation.mutate(form);
  };

  return (
    <div className="register">
      <section className="register__hero">
        <div className="register__brand">
          rent<span>·</span>a<span>·</span>car
        </div>
        <div className="register__hero-body">
          <h1>Crea tu cuenta y reserva en minutos.</h1>
          <p>
            Con tu cuenta puedes reservar un auto para las fechas que quieras y seguir tus
            arriendos desde “Mis arriendos”.
          </p>
        </div>
        <div className="register__hero-foot">Proyecto rent-a-car · microservicios Spring Boot</div>
      </section>

      <section className="register__form-wrap">
        <form className="register__form" onSubmit={submit}>
          <div>
            <h2>Crear cuenta</h2>
            <p>Completa tus datos para registrarte como cliente.</p>
          </div>

          <div className="register__grid">
            <div className="field">
              <label htmlFor="firstName">Nombre</label>
              <input id="firstName" value={form.firstName}
                onChange={(e) => set('firstName')(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="lastName">Apellido</label>
              <input id="lastName" value={form.lastName}
                onChange={(e) => set('lastName')(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="rut">RUT</label>
              <input id="rut" placeholder="12345678-9" value={form.rut}
                onChange={(e) => set('rut')(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Teléfono</label>
              <input id="phone" type="tel" placeholder="+56912345678" value={form.phone}
                onChange={(e) => set('phone')(e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="username" value={form.email}
              onChange={(e) => set('email')(e.target.value)} required />
          </div>

          <div className="register__grid">
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="new-password" minLength={6}
                value={form.password} onChange={(e) => set('password')(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="confirm">Repetir contraseña</label>
              <input id="confirm" type="password" autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="address">Dirección</label>
            <input id="address" value={form.address}
              onChange={(e) => set('address')(e.target.value)} required />
          </div>

          <div className="register__grid">
            <div className="field">
              <label htmlFor="city">Ciudad</label>
              <input id="city" value={form.city}
                onChange={(e) => set('city')(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="country">País</label>
              <input id="country" value={form.country}
                onChange={(e) => set('country')(e.target.value)} required />
            </div>
          </div>

          {(localError || mutation.isError) && (
            <p className="register__error" role="alert">
              {localError ?? mutation.error?.message}
            </p>
          )}

          <button type="submit" className="btn-primary register__submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="register__foot">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      </section>
    </div>
  );
}