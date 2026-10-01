import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteRental,
  getRentalAdmin,
  getRentalById,
  restoreRental,
  updateRentalDates,
  updateRentalStatus,
} from '../../api/rentals';
import { useAuth } from '../../context/AuthContext';
import type { RentalState } from '../../types/rental';
import { STATUS_LABELS } from '../../types/rental';
import { formatCLP } from '../../types/car';
import { addDays, daysBetween, formatDate, todayISO } from '../../utils/dates';
import './RentalDetailPage.css';

const STATUS_CLASS: Record<RentalState, string> = {
  PENDIENTE: 'status--pendiente',
  ACTIVO: 'status--activo',
  FINALIZADO: 'status--finalizado',
  CANCELADO: 'status--cancelado',
};

export default function RentalDetailPage() {
  const { id } = useParams();
  const rentalId = Number(id);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Esta ficha la pueden abrir ADMIN y EMPLOYEE. Solo el ADMIN ve eliminados, así que
  // el endpoint depende del rol: el de admin devuelve también los dados de baja, el
  // normal no. (El backend lo hace cumplir igual: /admin/{id} es solo ADMIN.)
  const isAdmin = user?.role === 'ADMIN';

  const { data: rental, isPending, isError, error } = useQuery({
    queryKey: ['rental', rentalId, isAdmin ? 'admin' : 'staff'],
    queryFn: () => (isAdmin ? getRentalAdmin(rentalId) : getRentalById(rentalId)),
    enabled: Number.isFinite(rentalId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals'] });
    queryClient.invalidateQueries({ queryKey: ['rental', rentalId] });
    // cambiar fechas, cancelar, eliminar o reactivar un arriendo cambia las fechas ocupadas del auto
    queryClient.invalidateQueries({ queryKey: ['occupied-cars'] });
    queryClient.invalidateQueries({ queryKey: ['car-availability'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: RentalState) => updateRentalStatus(rentalId, status),
    onSuccess: invalidate,
  });

  const datesMutation = useMutation({
    mutationFn: (dates: { startDate: string; endDate: string }) => updateRentalDates(rentalId, dates),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRental(rentalId),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreRental(rentalId),
    onSuccess: invalidate,
  });

  if (!Number.isFinite(rentalId)) {
    return <p className="rental-admin__state">La dirección no corresponde a un arriendo válido.</p>;
  }

  // Un EMPLOYEE que elimina el arriendo ya no puede volver a verlo (su endpoint filtra
  // los eliminados), así que se le muestra una confirmación en vez de un error 404.
  if (!isAdmin && deleteMutation.isSuccess) {
    return (
      <section className="rental-admin">
        <p className="rental-admin__state">
          Arriendo eliminado. <Link to="/admin/arriendos">Volver a arriendos</Link>.
        </p>
      </section>
    );
  }

  if (isPending) return <p className="rental-admin__state">Cargando arriendo…</p>;
  if (isError) {
    return (
      <div className="rental-admin__state rental-admin__state--error" role="alert">
        <p>{error.message}</p>
        <Link to="/admin/arriendos">Volver a arriendos</Link>
      </div>
    );
  }

  const isDeleted = rental.deleted === true;
  const isOpen = rental.status === 'PENDIENTE' || rental.status === 'ACTIVO';
  const busy =
    statusMutation.isPending || datesMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const days = daysBetween(rental.startDate, rental.endDate);
  const actionError =
    statusMutation.error?.message ??
    datesMutation.error?.message ??
    deleteMutation.error?.message ??
    restoreMutation.error?.message ??
    null;

  // Con el auto ya retirado (ACTIVO) solo se puede mover la devolución
  const startLocked = rental.status === 'ACTIVO';

  const openEditor = () => {
    setEditStart(rental.startDate);
    setEditEnd(rental.endDate);
    datesMutation.reset();
    setEditing(true);
  };

  const editDays = editStart && editEnd ? daysBetween(editStart, editEnd) : 0;
  const startChanged = editStart !== rental.startDate;
  const editError =
    !editStart || !editEnd
      ? 'Indica las dos fechas.'
      : editDays < 1
        ? 'La devolución debe ser posterior al retiro.'
        : startChanged && editStart < todayISO()
          ? 'La fecha de retiro no puede ser anterior a hoy.'
          : null;
  const datesUnchanged = editStart === rental.startDate && editEnd === rental.endDate;

  // El servidor mantiene la tarifa diaria del arriendo original (total / días),
  // así que la vista previa hace la misma cuenta.
  const dailyRate = days > 0 ? rental.totalPrice / days : 0;
  const previewTotal = editDays > 0 ? dailyRate * editDays : null;

  return (
    <section className="rental-admin">
      <Link to="/admin/arriendos" className="rental-admin__back">← Volver a arriendos</Link>

      <div className="rental-admin__header">
        <div>
          <p className="rental-admin__eyebrow mono">Arriendo #{rental.id}</p>
          <h1>
            {rental.car.brand} {rental.car.model}
            {' · '}
            {rental.user.firstName} {rental.user.lastName}
          </h1>
          <span className={`status ${STATUS_CLASS[rental.status]}`}>{STATUS_LABELS[rental.status]}</span>
        </div>
        {!isDeleted && (
          <div className="rental-admin__header-actions">
            {rental.status === 'PENDIENTE' && (
              <button type="button" className="btn-dark" disabled={busy}
                onClick={() => statusMutation.mutate('ACTIVO')}>
                Marcar como activo
              </button>
            )}
            {rental.status === 'ACTIVO' && (
              <button type="button" className="btn-dark" disabled={busy}
                onClick={() => statusMutation.mutate('FINALIZADO')}>
                Finalizar
              </button>
            )}
            {isOpen && (
              <button type="button" className="btn-outline-danger" disabled={busy}
                onClick={() => statusMutation.mutate('CANCELADO')}>
                Cancelar
              </button>
            )}
            <button type="button" className="btn-outline-danger" disabled={busy}
              onClick={() => {
                if (confirm(`¿Eliminar el arriendo #${rental.id}?`)) deleteMutation.mutate();
              }}>
              Eliminar
            </button>
          </div>
        )}
      </div>

      {isDeleted && (
        <div className="rental-admin__banner" role="status">
          <p>
            <strong>Arriendo eliminado.</strong> No aparece en el listado ni bloquea fechas del auto,
            pero se conserva para revisar su historial.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => {
              if (confirm(`¿Reactivar el arriendo #${rental.id}?`)) restoreMutation.mutate();
            }}
          >
            {restoreMutation.isPending ? 'Reactivando…' : 'Reactivar'}
          </button>
        </div>
      )}

      {actionError && <p className="rental-admin__state rental-admin__state--error" role="alert">{actionError}</p>}

      <div className="rental-admin__grid">
        <div className="rental-admin__card">
          <h2>Cliente</h2>
          <dl className="rental-admin__data">
            <div>
              <dt>Nombre</dt>
              <dd>
                <Link to={`/admin/usuarios/${rental.user.id}`} className="rental-admin__link">
                  {rental.user.firstName} {rental.user.lastName}
                </Link>
              </dd>
            </div>
            <div><dt>Correo</dt><dd>{rental.user.email}</dd></div>
          </dl>
        </div>

        <div className="rental-admin__card">
          <h2>Auto</h2>
          <dl className="rental-admin__data">
            <div>
              <dt>Modelo</dt>
              <dd>
                <Link to={`/admin/flota/${rental.car.id}`} className="rental-admin__link">
                  {rental.car.brand} {rental.car.model}
                </Link>
              </dd>
            </div>
            <div><dt>Patente</dt><dd className="mono">{rental.car.licensePlate}</dd></div>
            <div><dt>Tarifa diaria</dt><dd>{formatCLP(rental.car.dailyRate)}</dd></div>
          </dl>
        </div>

        <div className="rental-admin__card">
          <div className="rental-admin__card-head">
            <h2>Periodo y total</h2>
            {isOpen && !isDeleted && !editing && (
              <button type="button" className="rental-admin__edit-link" disabled={busy} onClick={openEditor}>
                Editar fechas
              </button>
            )}
          </div>

          {!editing && (
            <dl className="rental-admin__data">
              <div><dt>Retiro</dt><dd>{formatDate(rental.startDate)}</dd></div>
              <div><dt>Devolución</dt><dd>{formatDate(rental.endDate)}</dd></div>
              <div><dt>Duración</dt><dd>{days} {days === 1 ? 'día' : 'días'}</dd></div>
              <div><dt>Total</dt><dd className="rental-admin__total">{formatCLP(rental.totalPrice)}</dd></div>
            </dl>
          )}

          {editing && (
            <div className="rental-admin__edit">
              <div className="rental-admin__edit-row">
                <div className="field">
                  <label htmlFor="edit-start">Retiro</label>
                  <input
                    id="edit-start"
                    type="date"
                    min={todayISO()}
                    value={editStart}
                    disabled={startLocked}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-end">Devolución</label>
                  <input
                    id="edit-end"
                    type="date"
                    min={editStart ? addDays(editStart, 1) : undefined}
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
              </div>

              {startLocked && (
                <p className="rental-admin__edit-note">
                  El auto ya fue retirado: solo se puede cambiar la fecha de devolución.
                </p>
              )}

              <p className="rental-admin__edit-note">
                {previewTotal !== null && !editError
                  ? `${editDays} ${editDays === 1 ? 'día' : 'días'} · nuevo total ${formatCLP(previewTotal)} (misma tarifa del arriendo original)`
                  : ' '}
              </p>

              {editError && <p className="rental-admin__state rental-admin__state--error" role="alert">{editError}</p>}

              <div className="rental-admin__edit-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!!editError || datesUnchanged || datesMutation.isPending}
                  onClick={() => datesMutation.mutate({ startDate: editStart, endDate: editEnd })}
                >
                  {datesMutation.isPending ? 'Guardando…' : 'Guardar fechas'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={datesMutation.isPending}
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}