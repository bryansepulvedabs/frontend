import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCar, getCarAdmin, restoreCar, updateCar, updateCarAvailability } from '../../api/cars';
import type { CarRequest } from '../../api/cars';
import { getRentalsByCarId } from '../../api/rentals';
import CarCalendar from '../../components/CarCalendar';
import CarPhoto from '../../components/CarPhoto';
import type { Car, Category, Fuel } from '../../types/car';
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

const toForm = (car: Car): CarRequest => ({
  licensePlate: car.licensePlate,
  brand: car.brand,
  model: car.model,
  year: car.year,
  color: car.color ?? '',
  category: car.category,
  fuel: car.fuel,
  seats: car.seats,
  mileage: car.mileage,
  dailyRate: car.dailyRate,
});

export default function CarDetailAdminPage() {
  const { id } = useParams();
  const carId = Number(id);
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CarRequest | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: (dto: CarRequest) => updateCar(carId, dto),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
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

  const openEditor = () => {
    setForm(toForm(car));
    updateMutation.reset();
    setEditing(true);
  };

  const set = <K extends keyof CarRequest>(key: K, value: CarRequest[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) updateMutation.mutate({ ...form, licensePlate: form.licensePlate.trim().toUpperCase() });
  };

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
            {!editing && (
              <button type="button" className="btn-outline" onClick={openEditor}>
                Editar datos
              </button>
            )}
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
          <h2>{editing ? 'Editar datos' : 'Datos'}</h2>

          {!editing && (
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
          )}

          {editing && form && (
            <form className="car-admin__form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="e-brand">Marca</label>
                <input id="e-brand" value={form.brand} required
                  onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="e-model">Modelo</label>
                <input id="e-model" value={form.model} required
                  onChange={(e) => set('model', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="e-plate">Patente</label>
                <input id="e-plate" value={form.licensePlate} required minLength={5} maxLength={10}
                  onChange={(e) => set('licensePlate', e.target.value.toUpperCase())} />
              </div>
              <div className="field">
                <label htmlFor="e-year">Año</label>
                <input id="e-year" type="number" min={1980} max={2100} value={form.year} required
                  onChange={(e) => set('year', Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="e-color">Color</label>
                <input id="e-color" value={form.color}
                  onChange={(e) => set('color', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="e-seats">Asientos</label>
                <input id="e-seats" type="number" min={1} max={60} value={form.seats} required
                  onChange={(e) => set('seats', Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="e-category">Categoría</label>
                <select id="e-category" value={form.category}
                  onChange={(e) => set('category', e.target.value as Category)}>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="e-fuel">Combustible</label>
                <select id="e-fuel" value={form.fuel}
                  onChange={(e) => set('fuel', e.target.value as Fuel)}>
                  {(Object.keys(FUEL_LABELS) as Fuel[]).map((f) => (
                    <option key={f} value={f}>{FUEL_LABELS[f]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="e-mileage">Kilometraje</label>
                <input id="e-mileage" type="number" min={0} value={form.mileage} required
                  onChange={(e) => set('mileage', Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="e-rate">Tarifa diaria (CLP)</label>
                <input id="e-rate" type="number" min={1} value={form.dailyRate} required
                  onChange={(e) => set('dailyRate', Number(e.target.value))} />
              </div>

              <p className="car-admin__form-note">
                Cambiar la tarifa no afecta a los arriendos ya creados: conservan el precio pactado.
              </p>

              {updateMutation.isError && (
                <p className="car-admin__state car-admin__state--error car-admin__form-wide" role="alert">
                  {updateMutation.error.message}
                </p>
              )}

              <div className="car-admin__form-actions">
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
      </div>

      <div className="car-admin__card">
        <div className="car-admin__card-head">
          <h2>Calendario</h2>
        </div>
        {rentalsQuery.isPending && <p className="car-admin__state">Cargando calendario…</p>}
        {rentalsQuery.isError && (
          <p className="car-admin__state car-admin__state--error">{rentalsQuery.error.message}</p>
        )}
        {!rentalsQuery.isPending && !rentalsQuery.isError && <CarCalendar rentals={rentals} />}
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