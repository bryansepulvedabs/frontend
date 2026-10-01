import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCar, getCarAdmin, restoreCar, updateCarAvailability } from '../../api/cars';
import { getRentalsByCarId } from '../../api/rentals';
import CarPhoto from '../../components/CarPhoto';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../../types/car';
import { STATUS_LABELS } from '../../types/rental';
import type { RentalState } from '../../types/rental';
import { formatDate } from '../../utils/dates';
import './CarDetailAdminPage.css';

const STATUS_CLASS: Record<RentalState, string> = {
  PENDIENTE: 'status--pendiente',
  ACTIVO: 'status--activo',
  FINALIZADO: 'status--finalizado',
  CANCELADO: 'status--cancelado',
};

export default function CarDetailAdminPage() {
  const { id } = useParams();
  const carId = Number(id);
  const queryClient = useQueryClient();

  // Clave propia ('car-admin'): el catálogo usa ['car', id] con el endpoint público,
  // que no devuelve eliminados.
  const { data: car, isPending, isError, error } = useQuery({
    queryKey: ['car-admin', carId],
    queryFn: () => getCarAdmin(carId),
    enabled: Number.isFinite(carId),
  });

  const rentalsQuery = useQuery({
    queryKey: ['rentals', 'car', carId],
    queryFn: () => getRentalsByCarId(carId),
    enabled: Number.isFinite(carId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cars'] });
    queryClient.invalidateQueries({ queryKey: ['car', carId] });
    queryClient.invalidateQueries({ queryKey: ['car-admin', carId] });
  };

  const availabilityMutation = useMutation({
    mutationFn: (available: boolean) => updateCarAvailability(carId, available),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCar(carId),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreCar(carId),
    onSuccess: invalidate,
  });

  if (!Number.isFinite(carId)) {
    return <p className="car-admin__state">La dirección no corresponde a un auto válido.</p>;
  }
  if (isPending) return <p className="car-admin__state">Cargando auto…</p>;
  if (isError) {
    return (
      <div className="car-admin__state car-admin__state--error" role="alert">
        <p>{error.message}</p>
        <Link to="/admin/flota">Volver a la flota</Link>
      </div>
    );
  }

  const isDeleted = car.deleted === true;
  const rentals = rentalsQuery.data ?? [];
  const totalRevenue = rentals
    .filter((r) => r.status === 'FINALIZADO')
    .reduce((a, r) => a + r.totalPrice, 0);
  const actionError =
    availabilityMutation.error?.message ??
    deleteMutation.error?.message ??
    restoreMutation.error?.message ??
    null;

  return (
    <section className="car-admin">
      <Link to="/admin/flota" className="car-admin__back">← Volver a la flota</Link>

      <div className="car-admin__header">
        <div>
          <p className="car-admin__brand">{car.brand}</p>
          <h1>{car.model}</h1>
          <p className="car-admin__plate mono">{car.licensePlate}</p>
        </div>
        {!isDeleted && (
          <div className="car-admin__header-actions">
            <button
              type="button"
              className={car.availability ? 'btn-outline' : 'btn-primary'}
              disabled={availabilityMutation.isPending}
              onClick={() => availabilityMutation.mutate(!car.availability)}
            >
              {car.availability ? 'Marcar en mantención' : 'Volver a servicio'}
            </button>
            <button
              type="button"
              className="btn-outline-danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`¿Eliminar ${car.brand} ${car.model} (${car.licensePlate})?`)) {
                  deleteMutation.mutate();
                }
              }}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {isDeleted && (
        <div className="car-admin__banner" role="status">
          <p>
            <strong>Auto eliminado.</strong> No aparece en el catálogo ni se puede arrendar,
            pero su historial se conserva.
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={restoreMutation.isPending}
            onClick={() => {
              if (confirm(`¿Reactivar ${car.brand} ${car.model} (${car.licensePlate})?`)) {
                restoreMutation.mutate();
              }
            }}
          >
            {restoreMutation.isPending ? 'Reactivando…' : 'Reactivar'}
          </button>
        </div>
      )}

      {actionError && <p className="car-admin__state car-admin__state--error" role="alert">{actionError}</p>}

      <div className="car-admin__grid">
        <div className="car-admin__card car-admin__photo">
          <CarPhoto car={car} size="hero" />
        </div>

        <div className="car-admin__card">
          <h2>Datos</h2>
          <dl className="car-admin__data">
            <div><dt>Categoría</dt><dd>{CATEGORY_LABELS[car.category]}</dd></div>
            <div><dt>Combustible</dt><dd>{FUEL_LABELS[car.fuel]}</dd></div>
            <div><dt>Año</dt><dd>{car.year}</dd></div>
            <div><dt>Color</dt><dd>{car.color}</dd></div>
            <div><dt>Asientos</dt><dd>{car.seats}</dd></div>
            <div><dt>Kilometraje</dt><dd>{car.mileage.toLocaleString('es-CL')} km</dd></div>
            <div><dt>Tarifa diaria</dt><dd>{formatCLP(car.dailyRate)}</dd></div>
            <div>
              <dt>Estado</dt>
              <dd>{isDeleted ? 'Eliminado' : car.availability ? 'En servicio' : 'En mantención'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="car-admin__card">
        <div className="car-admin__card-head">
          <h2>Historial de arriendos</h2>
          {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length > 0 && (
            <p className="car-admin__summary">
              {rentals.length} {rentals.length === 1 ? 'arriendo' : 'arriendos'} · {formatCLP(totalRevenue)} facturado
            </p>
          )}
        </div>

        {rentalsQuery.isPending && <p className="car-admin__state">Cargando arriendos…</p>}
        {rentalsQuery.isError && (
          <p className="car-admin__state car-admin__state--error">{rentalsQuery.error.message}</p>
        )}
        {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length === 0 && (
          <p className="car-admin__state">Este auto todavía no tiene arriendos.</p>
        )}

        {!rentalsQuery.isPending && !rentalsQuery.isError && rentals.length > 0 && (
          <table className="car-admin__table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Cliente</th>
                <th>Fechas</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    <Link to={`/admin/arriendos/${r.id}`} className="car-admin__link">#{r.id}</Link>
                  </td>
                  <td>
                    <Link to={`/admin/usuarios/${r.user.id}`} className="car-admin__link">
                      {r.user.firstName} {r.user.lastName}
                    </Link>
                  </td>
                  <td>{formatDate(r.startDate)} → {formatDate(r.endDate)}</td>
                  <td>{formatCLP(r.totalPrice)}</td>
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