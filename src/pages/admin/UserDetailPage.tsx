import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserAdmin, restoreUser } from '../../api/users';
import { getRentalsByUserId } from '../../api/rentals';
import NewRentalForm from '../../components/NewRentalForm';
import { formatCLP } from '../../types/car';
import { STATUS_LABELS } from '../../types/rental';
import type { RentalState } from '../../types/rental';
import type { Role } from '../../types/auth';
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

export default function UserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

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

  const restoreMutation = useMutation({
    mutationFn: () => restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
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
          <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cerrar' : 'Nuevo arriendo'}
          </button>
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
        <h2>Datos de contacto</h2>
        <dl className="user-detail__data">
          <div><dt>RUT</dt><dd className="mono">{user.rut}</dd></div>
          <div><dt>Correo</dt><dd>{user.email}</dd></div>
          <div><dt>Teléfono</dt><dd>{user.phone}</dd></div>
          <div><dt>Dirección</dt><dd>{user.address}</dd></div>
          <div><dt>Ciudad</dt><dd>{user.city}</dd></div>
          <div><dt>País</dt><dd>{user.country}</dd></div>
        </dl>
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