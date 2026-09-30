import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCars } from '../api/cars';
import { getOccupiedCarIds } from '../api/rentals';
import CarCard from '../components/CarCard';
import type { Category, Fuel } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS } from '../types/car';
import { addDays, daysBetween, formatDate, todayISO } from '../utils/dates';
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

  // Fechas opcionales: sin fechas el catálogo muestra todo lo operativo, igual que antes.
  const today = todayISO();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const bothDates = !!startDate && !!endDate;
  const datesValid = bothDates && startDate >= today && daysBetween(startDate, endDate) >= 1;

  // Una sola llamada para todo el catálogo: devuelve los ids ocupados en el rango,
  // en vez de preguntar auto por auto.
  const occupiedQuery = useQuery({
    queryKey: ['occupied-cars', startDate, endDate],
    queryFn: () => getOccupiedCarIds(startDate, endDate),
    enabled: datesValid,
    staleTime: 0,
  });

  const occupied = useMemo(
    () => new Set(datesValid ? occupiedQuery.data ?? [] : []),
    [datesValid, occupiedQuery.data],
  );

  // availability = false es "fuera de servicio" (mantención), independiente de las fechas.
  // Estar ocupado depende del periodo elegido.
  const reasonFor = (carId: number, operational: boolean): 'maintenance' | 'booked' | null => {
    if (!operational) return 'maintenance';
    if (datesValid && occupied.has(carId)) return 'booked';
    return null;
  };

  const filtered = useMemo(() => {
    const matching = cars.filter(
      (c) =>
        (category === 'TODAS' || c.category === category) &&
        (fuel === 'TODOS' || c.fuel === fuel) &&
        (!onlyAvailable || reasonFor(c.id, c.availability) === null),
    );
    // Los no disponibles se muestran igual, pero al final: el usuario ve que el auto
    // existe y puede probar otras fechas.
    return matching.sort(
      (a, b) =>
        Number(reasonFor(a.id, a.availability) !== null) -
        Number(reasonFor(b.id, b.availability) !== null),
    );
  }, [cars, category, fuel, onlyAvailable, occupied, datesValid]);

  const availableCount = filtered.filter((c) => reasonFor(c.id, c.availability) === null).length;

  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const fuels = Object.keys(FUEL_LABELS) as Fuel[];

  const clearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const datesHint = () => {
    if (!startDate && !endDate) return 'Elige las fechas para ver qué autos están libres en ese periodo.';
    if (!bothDates) return 'Falta una de las dos fechas.';
    if (startDate < today) return 'La fecha de retiro no puede ser anterior a hoy.';
    if (daysBetween(startDate, endDate) < 1) return 'La devolución debe ser posterior al retiro.';
    if (occupiedQuery.isPending) return 'Comprobando disponibilidad…';
    if (occupiedQuery.isError) return 'No se pudo comprobar la disponibilidad; se muestran todos los autos.';
    return `${availableCount} ${availableCount === 1 ? 'auto libre' : 'autos libres'} del ${formatDate(startDate)} al ${formatDate(endDate)}.`;
  };

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

      <div className="catalog__dates">
        <div className="field">
          <label htmlFor="catalog-start">Retiro</label>
          <input
            id="catalog-start"
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => {
              const next = e.target.value;
              setStartDate(next);
              // Si la devolución quedó antes del nuevo retiro, se corre un día después
              if (next && endDate && daysBetween(next, endDate) < 1) setEndDate(addDays(next, 1));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="catalog-end">Devolución</label>
          <input
            id="catalog-end"
            type="date"
            min={startDate ? addDays(startDate, 1) : addDays(today, 1)}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(startDate || endDate) && (
          <button type="button" className="catalog__clear-dates" onClick={clearDates}>
            Limpiar fechas
          </button>
        )}
        <p className="catalog__dates-hint" aria-live="polite">{datesHint()}</p>
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
            <CarCard
              key={car.id}
              car={car}
              unavailableReason={reasonFor(car.id, car.availability)}
              startDate={datesValid ? startDate : undefined}
              endDate={datesValid ? endDate : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}