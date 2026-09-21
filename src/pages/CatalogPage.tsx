import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCars } from '../api/cars';
import CarCard from '../components/CarCard';
import type { Category, Fuel } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS } from '../types/car';
import './CatalogPage.css';

type CategoryFilter = Category | 'TODAS';
type FuelFilter = Fuel | 'TODOS';

export default function CatalogPage() {
  const {
    data: cars = [],
    isPending: loading,
    error,
    refetch,
  } = useQuery({ queryKey: ['cars'], queryFn: getCars });

  const [category, setCategory] = useState<CategoryFilter>('TODAS');
  const [fuel, setFuel] = useState<FuelFilter>('TODOS');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(
    () =>
      cars.filter(
        (c) =>
          (category === 'TODAS' || c.category === category) &&
          (fuel === 'TODOS' || c.fuel === fuel) &&
          (!onlyAvailable || c.availability),
      ),
    [cars, category, fuel, onlyAvailable],
  );

  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const fuels = Object.keys(FUEL_LABELS) as Fuel[];

  return (
    <section className="catalog">
      <div className="catalog__intro">
        <div>
          <h1>Elige tu auto</h1>
          <p>Tarifas diarias en pesos chilenos. El total se calcula según los días del arriendo.</p>
        </div>
        {!loading && !error && (
          <p className="catalog__count">
            {filtered.length} {filtered.length === 1 ? 'auto' : 'autos'}
          </p>
        )}
      </div>

      <div className="catalog__filters">
        <div className="pills" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className="pill"
            aria-pressed={category === 'TODAS'}
            onClick={() => setCategory('TODAS')}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="pill"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="catalog__side-filters">
          <label htmlFor="fuel">Combustible</label>
          <select id="fuel" value={fuel} onChange={(e) => setFuel(e.target.value as FuelFilter)}>
            <option value="TODOS">Todos</option>
            {fuels.map((f) => (
              <option key={f} value={f}>{FUEL_LABELS[f]}</option>
            ))}
          </select>
          <button
            type="button"
            className="pill"
            aria-pressed={onlyAvailable}
            onClick={() => setOnlyAvailable((v) => !v)}
          >
            Solo disponibles
          </button>
        </div>
      </div>

      {loading && <p className="catalog__state">Cargando autos…</p>}

      {error && (
        <div className="catalog__state catalog__state--error" role="alert">
          <p>{error.message}. Revisa que el api-gateway y car-service estén levantados.</p>
          <button type="button" className="btn-primary" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="catalog__state">No hay autos que coincidan con estos filtros.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="catalog__grid">
          {filtered.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </section>
  );
}