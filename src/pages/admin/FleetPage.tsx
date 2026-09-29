import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCar, deleteCar, getCars, updateCarAvailability } from '../../api/cars';
import type { CarRequest } from '../../api/cars';
import type { Car, Category, Fuel } from '../../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../../types/car';
import './FleetPage.css';

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
  const { data: cars = [], isPending, isError, error } = useQuery({ queryKey: ['cars'], queryFn: getCars });

  const [form, setForm] = useState<CarRequest>(emptyForm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cars'] });

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const available = cars.filter((c) => c.availability).length;

  return (
    <section className="fleet">
      <div className="fleet__intro">
        <div>
          <h1>Flota</h1>
          <p>
            {isPending
              ? 'Cargando…'
              : `${cars.length} autos · ${available} disponibles · ${cars.length - available} arrendados`}
          </p>
        </div>
      </div>

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
                  <th style={{ textAlign: 'right' }}>Disponible</th>
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
        <p className="fleet__car-model">{car.model}</p>
        <p className="fleet__car-brand">{car.brand}</p>
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
            aria-label={`Disponibilidad de ${car.brand} ${car.model}`}
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