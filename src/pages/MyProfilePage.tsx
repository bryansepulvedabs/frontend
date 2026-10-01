import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changePassword, getMe, updateMe } from '../api/users';
import type { ProfileUpdate } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth';
import type { User } from '../types/user';
import './MyProfilePage.css';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Administrador', EMPLOYEE: 'Empleado', CLIENT: 'Cliente' };

export default function MyProfilePage() {
  const { data: me, isPending, isError, error } = useQuery({ queryKey: ['me'], queryFn: getMe });

  if (isPending) return <p className="profile__state">Cargando tu perfil…</p>;
  if (isError) return <p className="profile__state profile__state--error" role="alert">{error.message}</p>;

  return (
    <section className="profile">
      <div className="profile__intro">
        <h1>Mi perfil</h1>
        <p>Tus datos de contacto y tu contraseña.</p>
      </div>

      <ProfileForm key={me.id} me={me} />
      <PasswordForm />
    </section>
  );
}

function ProfileForm({ me }: { me: User }) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  const [form, setForm] = useState<ProfileUpdate>({
    firstName: me.firstName,
    lastName: me.lastName,
    email: me.email,
    phone: me.phone,
    address: me.address,
    city: me.city,
    country: me.country,
  });
  const [saved, setSaved] = useState(false);

  const set = (field: keyof ProfileUpdate) => (value: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // El nombre y el correo de la sesión (los que se ven en el encabezado) se actualizan solos
      updateUser({ firstName: updated.firstName, lastName: updated.lastName, email: updated.email });
      setSaved(true);
    },
  });

  const unchanged = (Object.keys(form) as (keyof ProfileUpdate)[]).every((k) => form[k] === me[k]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate(form);
  };

  return (
    <form className="profile__card" onSubmit={submit}>
      <h2>Datos de contacto</h2>

      <dl className="profile__readonly">
        <div><dt>RUT</dt><dd className="mono">{me.rut}</dd></div>
        <div><dt>Tipo de cuenta</dt><dd>{ROLE_LABELS[me.role]}</dd></div>
      </dl>

      <div className="profile__grid">
        <div className="field">
          <label htmlFor="firstName">Nombre</label>
          <input id="firstName" value={form.firstName} required
            onChange={(e) => set('firstName')(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lastName">Apellido</label>
          <input id="lastName" value={form.lastName} required
            onChange={(e) => set('lastName')(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" value={form.email} required
            onChange={(e) => set('email')(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Teléfono</label>
          <input id="phone" type="tel" value={form.phone} required
            onChange={(e) => set('phone')(e.target.value)} />
        </div>
        <div className="field profile__wide">
          <label htmlFor="address">Dirección</label>
          <input id="address" value={form.address} required
            onChange={(e) => set('address')(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="city">Ciudad</label>
          <input id="city" value={form.city} required
            onChange={(e) => set('city')(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="country">País</label>
          <input id="country" value={form.country} required
            onChange={(e) => set('country')(e.target.value)} />
        </div>
      </div>

      {mutation.isError && (
        <p className="profile__state profile__state--error" role="alert">{mutation.error.message}</p>
      )}
      {saved && <p className="profile__state profile__state--ok" role="status">Cambios guardados.</p>}

      <div className="profile__actions">
        <button type="submit" className="btn-primary" disabled={unchanged || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (next.length < 6) {
      setLocalError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (next !== confirm) {
      setLocalError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setLocalError(null);
    mutation.mutate();
  };

  return (
    <form className="profile__card" onSubmit={submit}>
      <h2>Cambiar contraseña</h2>

      <div className="profile__grid">
        <div className="field profile__wide">
          <label htmlFor="current">Contraseña actual</label>
          <input id="current" type="password" autoComplete="current-password" value={current} required
            onChange={(e) => { setCurrent(e.target.value); setDone(false); }} />
        </div>
        <div className="field">
          <label htmlFor="next">Nueva contraseña</label>
          <input id="next" type="password" autoComplete="new-password" minLength={6} value={next} required
            onChange={(e) => { setNext(e.target.value); setDone(false); }} />
        </div>
        <div className="field">
          <label htmlFor="confirm">Repetir nueva contraseña</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} required
            onChange={(e) => { setConfirm(e.target.value); setDone(false); }} />
        </div>
      </div>

      {(localError || mutation.isError) && (
        <p className="profile__state profile__state--error" role="alert">
          {localError ?? mutation.error?.message}
        </p>
      )}
      {done && <p className="profile__state profile__state--ok" role="status">Contraseña actualizada.</p>}

      <div className="profile__actions">
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  );
}