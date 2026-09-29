import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRentalsByUserId, updateRentalStatus } from '../api/rentals';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABELS } from '../types/rental';
import type { RentalState } from '../types/rental';
import { formatCLP } from '../types/car';
import './MyRentalsPage.css';

const STATUS_CLASS: Record<RentalState, string> = {
  PENDIENTE: 'status--pendiente',
  ACTIVO: 'status--activo',
  FINALIZADO: 'status--finalizado',
  CANCELADO: 'status--cancelado',
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MyRentalsPage() {
  const { user } = useAuth();
  // La ruta está protegida (ProtectedRoute), así que en este punto siempre hay sesión
  const userId = user!.id;

  const queryClient = useQueryClient();
  const { data: rentals = [], isPending, isError, error } = useQuery({
    queryKey: ['rentals', 'user', userId],
    queryFn: () => getRentalsByUserId(userId),
  });

  const cancelMutation = useMutation({
    mutationFn: (rentalId: number) => updateRentalStatus(rentalId, 'CANCELADO'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals', 'user', userId] });
      // cancelar libera el auto en car-service
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });

  return (
    <section className="my-rentals">
      <div className="my-rentals__intro">
        <h1>Mis arriendos</h1>
        <p>Tus reservas actuales y el historial de arriendos.</p>
      </div>

      {isPending && <p className="my-rentals__state">Cargando tus arriendos…</p>}
      {isError && <p className="my-rentals__state my-rentals__state--error">{error.message}</p>}

      {!isPending && !isError && rentals.length === 0 && (
        <div className="my-rentals__empty">
          <p>Aún no tienes arriendos.</p>
          <Link to="/" className="btn-primary">Ver el catálogo</Link>
        </div>
      )}

      {!isPending && !isError && rentals.length > 0 && (
        <div className="my-rentals__list">
          {rentals.map((r) => (
            <article key={r.id} className="my-rentals__card">
              <div className="my-rentals__main">
                <p className="my-rentals__car">{r.car.brand} {r.car.model}</p>
                <p className="my-rentals__meta mono">{r.car.licensePlate} · Arriendo #{r.id}</p>
              </div>
              <div className="my-rentals__dates">
                {formatDate(r.startDate)} → {formatDate(r.endDate)}
              </div>
              <div className="my-rentals__total">{formatCLP(r.totalPrice)}</div>
              <span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              <div className="my-rentals__actions">
                {r.status === 'PENDIENTE' && (
                  <button
                    type="button"
                    className="btn-outline-danger"
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      if (confirm(`¿Cancelar el arriendo #${r.id}?`)) {
                        cancelMutation.mutate(r.id);
                      }
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {cancelMutation.isError && (
        <p className="my-rentals__state my-rentals__state--error">{cancelMutation.error.message}</p>
      )}
    </section>
  );
}