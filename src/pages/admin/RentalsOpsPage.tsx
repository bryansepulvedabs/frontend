import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRental, getAllRentals, updateRentalStatus } from '../../api/rentals';
import NewRentalForm from '../../components/NewRentalForm';
import type { RentalState } from '../../types/rental';
import { STATUS_LABELS } from '../../types/rental';
import { formatCLP } from '../../types/car';
import './RentalsOpsPage.css';

type StatusFilter = RentalState | 'TODOS';

const STATUS_CLASS: Record<RentalState, string> = {
  PENDIENTE: 'status--pendiente',
  ACTIVO: 'status--activo',
  FINALIZADO: 'status--finalizado',
  CANCELADO: 'status--cancelado',
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
};

export default function RentalsOpsPage() {
  const queryClient = useQueryClient();
  const { data: rentals = [], isPending, isError, error } = useQuery({
    queryKey: ['rentals'],
    queryFn: getAllRentals,
  });
  const [filter, setFilter] = useState<StatusFilter>('TODOS');
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals'] });
    // crear/finalizar/cancelar cambia la disponibilidad del auto en car-service
    queryClient.invalidateQueries({ queryKey: ['cars'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RentalState }) => updateRentalStatus(id, status),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRental,
    onSuccess: invalidate,
  });

  const filtered = rentals.filter((r) => filter === 'TODOS' || r.status === filter);

  const count = (s: RentalState) => rentals.filter((r) => r.status === s).length;
  const revenue = rentals.filter((r) => r.status === 'FINALIZADO').reduce((a, r) => a + r.totalPrice, 0);

  return (
    <section className="rentals-ops">
      <div className="rentals-ops__intro">
        <div>
          <h1>Arriendos</h1>
          <p>Finaliza o cancela arriendos; la disponibilidad del auto se actualiza sola.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cerrar' : 'Nuevo arriendo'}
        </button>
      </div>

      {showForm && (
        <div className="rentals-ops__new-panel">
          <h2>Nuevo arriendo</h2>
          <p className="rentals-ops__new-hint">Para un cliente que llega directo, sin haber reservado por la app.</p>
          <NewRentalForm
            onCreated={() => {
              invalidate();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {!isPending && !isError && (
        <div className="rentals-ops__kpis">
          <div className="kpi"><span>Activos</span><strong>{count('ACTIVO')}</strong></div>
          <div className="kpi"><span>Pendientes</span><strong>{count('PENDIENTE')}</strong></div>
          <div className="kpi"><span>Finalizados</span><strong>{count('FINALIZADO')}</strong></div>
          <div className="kpi"><span>Facturado finalizados</span><strong>{formatCLP(revenue)}</strong></div>
        </div>
      )}

      <div className="pills" role="group" aria-label="Filtrar por estado">
        <button type="button" className="pill" aria-pressed={filter === 'TODOS'} onClick={() => setFilter('TODOS')}>
          Todos
        </button>
        {(Object.keys(STATUS_LABELS) as RentalState[]).map((s) => (
          <button key={s} type="button" className="pill" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isPending && <p className="rentals-ops__state">Cargando arriendos…</p>}
      {isError && <p className="rentals-ops__state rentals-ops__state--error">{error.message}</p>}

      {!isPending && !isError && (
        <div className="rentals-ops__table-wrap">
          <table className="rentals-ops__table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Cliente</th>
                <th>Auto</th>
                <th>Fechas</th>
                <th>Total</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const busy = statusMutation.isPending || deleteMutation.isPending;
                return (
                  <tr key={r.id}>
                    <td className="mono">#{r.id}</td>
                    <td>
                      <p className="rentals-ops__primary">{r.user.firstName} {r.user.lastName}</p>
                      <p className="rentals-ops__secondary">{r.user.email}</p>
                    </td>
                    <td>
                      <p className="rentals-ops__primary">{r.car.brand} {r.car.model}</p>
                      <p className="rentals-ops__secondary mono">{r.car.licensePlate}</p>
                    </td>
                    <td>{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                    <td className="rentals-ops__total">{formatCLP(r.totalPrice)}</td>
                    <td><span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                    <td>
                      <div className="rentals-ops__actions">
                        {r.status === 'ACTIVO' && (
                          <button type="button" className="btn-dark" disabled={busy}
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'FINALIZADO' })}>
                            Finalizar
                          </button>
                        )}
                        {(r.status === 'ACTIVO' || r.status === 'PENDIENTE') && (
                          <button type="button" className="btn-outline-danger" disabled={busy}
                            onClick={() => statusMutation.mutate({ id: r.id, status: 'CANCELADO' })}>
                            Cancelar
                          </button>
                        )}
                        <button type="button" className="rentals-ops__delete" disabled={busy}
                          onClick={() => {
                            if (confirm(`¿Eliminar el arriendo #${r.id}?`)) deleteMutation.mutate(r.id);
                          }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}