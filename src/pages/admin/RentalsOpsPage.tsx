import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteRental,
  getAllRentals,
  getDeletedRentals,
  restoreRental,
  updateRentalStatus,
} from '../../api/rentals';
import NewRentalForm from '../../components/NewRentalForm';
import type { RentalState } from '../../types/rental';
import { STATUS_LABELS } from '../../types/rental';
import { formatCLP } from '../../types/car';
import './RentalsOpsPage.css';

type StatusFilter = RentalState | 'TODOS';
type Tab = 'active' | 'deleted';

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
  const [tab, setTab] = useState<Tab>('active');

  const activeQuery = useQuery({ queryKey: ['rentals'], queryFn: getAllRentals });

  const deletedQuery = useQuery({
    queryKey: ['rentals', 'deleted'],
    queryFn: getDeletedRentals,
    enabled: tab === 'deleted',
  });

  const [filter, setFilter] = useState<StatusFilter>('TODOS');
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rentals'] });
    queryClient.invalidateQueries({ queryKey: ['rental'] });
    queryClient.invalidateQueries({ queryKey: ['occupied-cars'] });
    queryClient.invalidateQueries({ queryKey: ['car-availability'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RentalState }) => updateRentalStatus(id, status),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRental,
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreRental,
    onSuccess: invalidate,
  });

  const query = tab === 'active' ? activeQuery : deletedQuery;
  const rentals = query.data ?? [];
  const filtered = rentals.filter((r) => filter === 'TODOS' || r.status === filter);

  const activeRentals = activeQuery.data ?? [];
  const count = (s: RentalState) => activeRentals.filter((r) => r.status === s).length;
  const revenue = activeRentals
    .filter((r) => r.status === 'FINALIZADO')
    .reduce((a, r) => a + r.totalPrice, 0);

  const busy = statusMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;
  const actionError =
    statusMutation.error?.message ?? deleteMutation.error?.message ?? restoreMutation.error?.message ?? null;

  return (
    <section className="rentals-ops">
      <div className="rentals-ops__intro">
        <div>
          <h1>Arriendos</h1>
          <p>Reservas, arriendos activos e historial. El auto queda ocupado solo en las fechas del arriendo.</p>
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

      {tab === 'active' && !activeQuery.isPending && !activeQuery.isError && (
        <div className="rentals-ops__kpis">
          <div className="kpi"><span>Activos</span><strong>{count('ACTIVO')}</strong></div>
          <div className="kpi"><span>Pendientes</span><strong>{count('PENDIENTE')}</strong></div>
          <div className="kpi"><span>Finalizados</span><strong>{count('FINALIZADO')}</strong></div>
          <div className="kpi"><span>Facturado finalizados</span><strong>{formatCLP(revenue)}</strong></div>
        </div>
      )}

      <div className="rentals-ops__tabs" role="tablist" aria-label="Estado de los arriendos">
        <button type="button" role="tab" className="rentals-ops__tab"
          aria-selected={tab === 'active'} onClick={() => setTab('active')}>
          Vigentes
        </button>
        <button type="button" role="tab" className="rentals-ops__tab"
          aria-selected={tab === 'deleted'} onClick={() => setTab('deleted')}>
          Eliminados
        </button>
      </div>

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

      {actionError && (
        <p className="rentals-ops__state rentals-ops__state--error" role="alert">{actionError}</p>
      )}

      {query.isPending && <p className="rentals-ops__state">Cargando arriendos…</p>}
      {query.isError && <p className="rentals-ops__state rentals-ops__state--error">{query.error.message}</p>}

      {!query.isPending && !query.isError && filtered.length === 0 && (
        <p className="rentals-ops__state">
          {tab === 'active'
            ? 'No hay arriendos que coincidan con este filtro.'
            : 'No hay arriendos eliminados.'}
        </p>
      )}

      {!query.isPending && !query.isError && filtered.length > 0 && (
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
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    <Link to={`/admin/arriendos/${r.id}`} className="rentals-ops__link">#{r.id}</Link>
                  </td>
                  <td>
                    <p className="rentals-ops__primary">
                      <Link to={`/admin/usuarios/${r.user.id}`} className="rentals-ops__link">
                        {r.user.firstName} {r.user.lastName}
                      </Link>
                    </p>
                    <p className="rentals-ops__secondary">{r.user.email}</p>
                  </td>
                  <td>
                    <p className="rentals-ops__primary">
                      <Link to={`/admin/flota/${r.car.id}`} className="rentals-ops__link">
                        {r.car.brand} {r.car.model}
                      </Link>
                    </p>
                    <p className="rentals-ops__secondary mono">{r.car.licensePlate}</p>
                  </td>
                  <td>{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                  <td className="rentals-ops__total">{formatCLP(r.totalPrice)}</td>
                  <td><span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                  <td>
                    <div className="rentals-ops__actions">
                      <Link to={`/admin/arriendos/${r.id}`} className="rentals-ops__detail-link">
                        Ver detalles
                      </Link>
                      {tab === 'active' ? (
                        <>
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
                        </>
                      ) : (
                        <button type="button" className="rentals-ops__restore" disabled={busy}
                          onClick={() => {
                            if (confirm(`¿Reactivar el arriendo #${r.id}?`)) restoreMutation.mutate(r.id);
                          }}>
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}