import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCar,
  deleteCar,
  getCars,
  getDeletedCars,
  restoreCar,
  updateCarAvailability,
} from '../../api/cars';
import type { CarRequest } from '../../api/cars';
import type { Car, Category, Fuel } from '../../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../../types/car';
import './FleetPage.css';

type Tab = 'active' | 'deleted';

const emptyForm: CarRequest = {
  licensePlate: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  category: 'SEDAN',
  fuel: 'GASOLINA',
  seats: 5,
  mileage: 0,
  dailyRate: 30000,
};

export default function FleetPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');

  const { data: cars = [], isPending, isError, error } = useQuery({ queryKey: ['cars'], queryFn: getCars });

  const deletedQuery = useQuery({
    queryKey: ['cars', 'deleted'],
    queryFn: getDeletedCars,
    enabled: tab === 'deleted',
  });

  const [form, setForm] = useState<CarRequest>(emptyForm);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cars'] });
    queryClient.invalidateQueries({ queryKey: ['car-admin'] });
  };

  const createMutation = useMutation({
    mutationFn: createCar,
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) =>
      updateCarAvailability(id, available),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreCar,
    onSuccess: invalidate,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const operational = cars.filter((c) => c.availability).length;

  const actionError =
    deleteMutation.error?.message ?? restoreMutation.error?.message ?? availabilityMutation.error?.message ?? null;

  return (
    <section className="fleet">
      <div className="fleet__intro">
        <div>
          <h1>Flota</h1>
          <p>
            {isPending
              ? 'Cargando…'
              : `${cars.length} autos · ${operational} en servicio · ${cars.length - operational} en mantención`}
          </p>
        </div>
      </div>

      <div className="fleet__tabs" role="tablist" aria-label="Estado de los autos">
        <button type="button" role="tab" className="fleet__tab"
          aria-selected={tab === 'active'} onClick={() => setTab('active')}>
          Activos
        </button>
        <button type="button" role="tab" className="fleet__tab"
          aria-selected={tab === 'deleted'} onClick={() => setTab('deleted')}>
          Eliminados
        </button>
      </div>

      {actionError && (
        <p className="fleet__state fleet__state--error" role="alert">{actionError}</p>
      )}

      {tab === 'active' && (
        <div className="fleet__layout">
          <div className="fleet__table-wrap">
            {isPending && <p className="fleet__state">Cargando flota…</p>}
            {isError && <p className="fleet__state fleet__state--error">{error.message}</p>}

            {!isPending && !isError && (
              <table className="fleet__table">
                <thead>
                  <tr>
                    <th>Auto</th>
                    <th>Patente</th>
                    <th>Categoría</th>
                    <th>Combustible</th>
                    <th>Tarifa</th>
                    <th style={{ textAlign: 'right' }}>En servicio</th>
                    <th style={{ textAlign: 'right' }}>Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <CarRow
                      key={car.id}
                      car={car}
                      onToggle={(available) => availabilityMutation.mutate({ id: car.id, available })}
                      onDelete={() => {
                        if (confirm(`¿Eliminar ${car.brand} ${car.model} (${car.licensePlate})?`)) {
                          deleteMutation.mutate(car.id);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <aside className="fleet__form-card">
            <h2>Agregar auto</h2>
            <form className="fleet__form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="brand">Marca</label>
                <input id="brand" value={form.brand} required
                  onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="model">Modelo</label>
                <input id="model" value={form.model} required
                  onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="plate">Patente</label>
                <input id="plate" placeholder="ABCD-12" value={form.licensePlate} required
                  onChange={(e) => setForm({ ...form, licensePlate: e.target.value.toUpperCase() })} />
              </div>
              <div className="fleet__form-row">
                <div className="field">
                  <label htmlFor="year">Año</label>
                  <input id="year" type="number" value={form.year} required
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label htmlFor="color">Color</label>
                  <input id="color" value={form.color} required
                    onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div className="fleet__form-row">
                <div className="field">
                  <label htmlFor="category">Categoría</label>
                  <select id="category" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fuel">Combustible</label>
                  <select id="fuel" value={form.fuel}
                    onChange={(e) => setForm({ ...form, fuel: e.target.value as Fuel })}>
                    {(Object.keys(FUEL_LABELS) as Fuel[]).map((f) => (
                      <option key={f} value={f}>{FUEL_LABELS[f]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fleet__form-row">
                <div className="field">
                  <label htmlFor="seats">Asientos</label>
                  <input id="seats" type="number" min={1} value={form.seats} required
                    onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label htmlFor="mileage">Kilometraje</label>
                  <input id="mileage" type="number" min={0} value={form.mileage} required
                    onChange={(e) => setForm({ ...form, mileage: Number(e.target.value) })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="rate">Tarifa diaria (CLP)</label>
                <input id="rate" type="number" min={0} value={form.dailyRate} required
                  onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })} />
              </div>

              {createMutation.isError && (
                <p className="fleet__state fleet__state--error">{createMutation.error.message}</p>
              )}

              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando…' : 'Guardar auto'}
              </button>
            </form>
          </aside>
        </div>
      )}

      {tab === 'deleted' && (
        <div className="fleet__table-wrap">
          {deletedQuery.isPending && <p className="fleet__state">Cargando autos eliminados…</p>}
          {deletedQuery.isError && (
            <p className="fleet__state fleet__state--error">{deletedQuery.error.message}</p>
          )}
          {!deletedQuery.isPending && !deletedQuery.isError && deletedQuery.data.length === 0 && (
            <p className="fleet__state">No hay autos eliminados.</p>
          )}

          {!deletedQuery.isPending && !deletedQuery.isError && deletedQuery.data.length > 0 && (
            <table className="fleet__table">
              <thead>
                <tr>
                  <th>Auto</th>
                  <th>Patente</th>
                  <th>Categoría</th>
                  <th>Combustible</th>
                  <th>Tarifa</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {deletedQuery.data.map((car) => (
                  <tr key={car.id}>
                    <td>
                      <Link to={`/admin/flota/${car.id}`} className="fleet__car-link">
                        <p className="fleet__car-model">{car.model}</p>
                        <p className="fleet__car-brand">{car.brand}</p>
                      </Link>
                    </td>
                    <td className="mono">{car.licensePlate}</td>
                    <td>{CATEGORY_LABELS[car.category]}</td>
                    <td>{FUEL_LABELS[car.fuel]}</td>
                    <td className="fleet__rate">{formatCLP(car.dailyRate)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="fleet__restore"
                        disabled={restoreMutation.isPending}
                        onClick={() => {
                          if (confirm(`¿Reactivar ${car.brand} ${car.model} (${car.licensePlate})?`)) {
                            restoreMutation.mutate(car.id);
                          }
                        }}
                      >
                        Reactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function CarRow({ car, onToggle, onDelete }: {
  car: Car;
  onToggle: (available: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td>
        <Link to={`/admin/flota/${car.id}`} className="fleet__car-link">
          <p className="fleet__car-model">{car.model}</p>
          <p className="fleet__car-brand">{car.brand}</p>
        </Link>
      </td>
      <td className="mono">{car.licensePlate}</td>
      <td>{CATEGORY_LABELS[car.category]}</td>
      <td>{FUEL_LABELS[car.fuel]}</td>
      <td className="fleet__rate">{formatCLP(car.dailyRate)}</td>
      <td>
        <div className="fleet__switch-cell">
          <span>{car.availability ? 'Sí' : 'No'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={car.availability}
            aria-label={`Estado operativo de ${car.brand} ${car.model}`}
            className={`switch ${car.availability ? 'switch--on' : ''}`}
            onClick={() => onToggle(!car.availability)}
          >
            <span className="switch__knob" />
          </button>
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <button type="button" className="fleet__delete" onClick={onDelete}>Eliminar</button>
      </td>
    </tr>
  );
}