import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserAdmin, restoreUser, updateUser } from '../../api/users';
import { getRentalsByUserId } from '../../api/rentals';
import NewRentalForm from '../../components/NewRentalForm';
import { formatCLP } from '../../types/car';
import { STATUS_LABELS } from '../../types/rental';
import type { RentalState } from '../../types/rental';
import type { Role } from '../../types/auth';
import type { User, UserRequest } from '../../types/user';
import './UserDetailPage.css';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', EMPLOYEE: 'Empleado', CLIENT: 'Cliente' };

const STATUS_CLASS: Record<RentalState, string> = {
  PENDIENTE: 'status--pendiente',
  ACTIVO: 'status--activo',
  FINALIZADO: 'status--finalizado',
  CANCELADO: 'status--cancelado',
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Sin password: al editar es opcional (vacío = se conserva la actual)
const toForm = (u: User): UserRequest => ({
  rut: u.rut,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  address: u.address,
  city: u.city,
  country: u.country,
  role: u.role,
});

export default function UserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UserRequest | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Endpoint de admin: devuelve al usuario aunque esté eliminado (deleted = true)
  const { data: user, isPending, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserAdmin(userId),
    enabled: Number.isFinite(userId),
  });

  const rentalsQuery = useQuery({
    queryKey: ['rentals', 'user', userId],
    queryFn: () => getRentalsByUserId(userId),
    enabled: Number.isFinite(userId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const restoreMutation = useMutation({
    mutationFn: () => restoreUser(userId),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UserRequest) => updateUser(userId, dto),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setNewPassword('');
    },
  });

  if (!Number.isFinite(userId)) {
    return <p className="user-detail__state">La dirección no corresponde a un usuario válido.</p>;
  }
  if (isPending) return <p className="user-detail__state">Cargando ficha…</p>;
  if (isError) {
    return (
      <div className="user-detail__state user-detail__state--error" role="alert">
        <p>{error.message}</p>
        <Link to="/admin/usuarios">Volver a usuarios</Link>
      </div>
    );
  }

  const isDeleted = user.deleted === true;
  const rentals = rentalsQuery.data ?? [];
  const totalSpent = rentals
    .filter((r) => r.status === 'FINALIZADO' || r.status === 'ACTIVO')
    .reduce((a, r) => a + r.totalPrice, 0);

  const openEditor = () => {
    setForm(toForm(user));
    setNewPassword('');
    updateMutation.reset();
    setShowForm(false);
    setEditing(true);
  };

  const set = <K extends keyof UserRequest>(key: K, value: UserRequest[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    // La contraseña solo viaja si el admin escribió una nueva
    updateMutation.mutate(newPassword.trim() ? { ...form, password: newPassword } : form);
  };

  return (
    <section className="user-detail">
      <Link to="/admin/usuarios" className="user-detail__back">← Volver a usuarios</Link>

      <div className="user-detail__header">
        <div className="user-detail__identity">
          <span className="user-detail__avatar">
            {user.firstName[0]}{user.lastName[0]}
          </span>
          <div>
            <h1>{user.firstName} {user.lastName}</h1>
            <p className="user-detail__role">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        {!isDeleted && (
          <div className="user-detail__header-actions">
            {!editing && (
              <button type="button" className="btn-outline" onClick={openEditor}>
                Editar datos
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cerrar' : 'Nuevo arriendo'}
            </button>
          </div>
        )}
      </div>

      {isDeleted && (
        <div className="user-detail__banner" role="status">
          <p>
            <strong>Usuario eliminado.</strong> No puede iniciar sesión ni aparece en el listado,
            pero su historial se conserva.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={restoreMutation.isPending}
            onClick={() => {
              if (confirm(`¿Reactivar a ${user.firstName} ${user.lastName}?`)) {
                restoreMutation.mutate();
              }
            }}
          >
            {restoreMutation.isPending ? 'Reactivando…' : 'Reactivar'}
          </button>
        </div>
      )}

      {restoreMutation.isError && (
        <p className="user-detail__state user-detail__state--error" role="alert">
          {restoreMutation.error.message}
        </p>
      )}

      {showForm && !isDeleted && (
        <div className="user-detail__card">
          <h2>Nuevo arriendo para {user.firstName}</h2>
          <NewRentalForm
            client={user}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['rentals'] });
              queryClient.invalidateQueries({ queryKey: ['occupied-cars'] });
              setShowForm(false);
            }}
          />
        </div>
      )}

      <div className="user-detail__card">
        <h2>{editing ? 'Editar datos' : 'Datos de contacto'}</h2>

        {!editing && (
          <dl className="user-detail__data">
            <div><dt>RUT</dt><dd className="mono">{user.rut}</dd></div>
            <div><dt>Correo</dt><dd>{user.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{user.phone}</dd></div>
            <div><dt>Dirección</dt><dd>{user.address}</dd></div>
            <div><dt>Ciudad</dt><dd>{user.city}</dd></div>
            <div><dt>País</dt><dd>{user.country}</dd></div>
          </dl>
        )}

        {editing && form && (
          <form className="user-detail__form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="u-first">Nombre</label>
              <input id="u-first" value={form.firstName} required
                onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-last">Apellido</label>
              <input id="u-last" value={form.lastName} required
                onChange={(e) => set('lastName', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-rut">RUT</label>
              <input id="u-rut" value={form.rut} required
                onChange={(e) => set('rut', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-email">Correo electrónico</label>
              <input id="u-email" type="email" value={form.email} required
                onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-phone">Teléfono</label>
              <input id="u-phone" type="tel" value={form.phone} required
                onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-role">Rol</label>
              <select id="u-role" value={form.role}
                onChange={(e) => set('role', e.target.value as Role)}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="field user-detail__form-wide">
              <label htmlFor="u-address">Dirección</label>
              <input id="u-address" value={form.address} required
                onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-city">Ciudad</label>
              <input id="u-city" value={form.city} required
                onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="u-country">País</label>
              <input id="u-country" value={form.country} required
                onChange={(e) => set('country', e.target.value)} />
            </div>
            <div className="field user-detail__form-wide">
              <label htmlFor="u-password">Nueva contraseña (opcional)</label>
              <input id="u-password" type="password" autoComplete="new-password" minLength={6}
                placeholder="Déjala vacía para conservar la actual"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>

            {updateMutation.isError && (
              <p className="user-detail__state user-detail__state--error user-detail__form-wide" role="alert">
                {updateMutation.error.message}
              </p>
            )}

            <div className="user-detail__form-actions">
              <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button type="button" className="btn-outline" disabled={updateMutation.isPending}
                onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="user-detail__card">
        <div className="user-detail__card-head">
          <h2>Historial de arriendos</h2>
          {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length > 0 && (
            <p className="user-detail__summary">
              {rentals.length} {rentals.length === 1 ? 'arriendo' : 'arriendos'} · {formatCLP(totalSpent)} facturado
            </p>
          )}
        </div>

        {rentalsQuery.isPending && <p className="user-detail__state">Cargando arriendos…</p>}
        {rentalsQuery.isError && (
          <p className="user-detail__state user-detail__state--error">{rentalsQuery.error.message}</p>
        )}
        {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length === 0 && (
          <p className="user-detail__state">Este usuario todavía no tiene arriendos.</p>
        )}

        {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length > 0 && (
          <table className="user-detail__table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Auto</th>
                <th>Fechas</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    <Link to={`/admin/arriendos/${r.id}`} className="user-detail__link">#{r.id}</Link>
                  </td>
                  <td>
                    <p className="user-detail__primary">
                      <Link to={`/admin/flota/${r.car.id}`} className="user-detail__link">
                        {r.car.brand} {r.car.model}
                      </Link>
                    </p>
                    <p className="user-detail__secondary mono">{r.car.licensePlate}</p>
                  </td>
                  <td>{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                  <td className="user-detail__primary">{formatCLP(r.totalPrice)}</td>
                  <td><span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}