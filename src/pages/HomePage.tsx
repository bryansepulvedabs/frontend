import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCars } from '../api/cars';
import { getOccupiedCarIds } from '../api/rentals';
import CarCard from '../components/CarCard';
import type { Category, Fuel } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS } from '../types/car';
import { addDays, daysBetween, formatDate, todayISO } from '../utils/dates';
import './HomePage.css';

type CategoryFilter = Category | 'TODAS';
type UnavailableReason = 'maintenance' | 'booked' | null;

// availability = false es "fuera de servicio" (mantención), independiente de las fechas.
// Estar ocupado depende del periodo elegido.
function reasonFor(
  carId: number,
  operational: boolean,
  datesValid: boolean,
  occupied: Set<number>,
): UnavailableReason {
  if (!operational) return 'maintenance';
  if (datesValid && occupied.has(carId)) return 'booked';
  return null;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const FUELS = Object.keys(FUEL_LABELS) as Fuel[];

export default function HomePage() {
  const { hash, key } = useLocation();

  // "/#catalogo" (enlace del menú) baja al catálogo; cualquier otra entrada a "/" parte arriba.
  useEffect(() => {
    if (hash === '#catalogo') {
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash, key]);

  const {
    data: cars = [],
    isPending: loading,
    error,
    refetch,
  } = useQuery({ queryKey: ['cars'], queryFn: getCars });

  const [category, setCategory] = useState<CategoryFilter>('TODAS');
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [search, setSearch] = useState('');

  // Fechas opcionales: sin fechas el catálogo muestra todo lo operativo.
  const today = todayISO();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const bothDates = !!startDate && !!endDate;
  const datesValid = bothDates && startDate >= today && daysBetween(startDate, endDate) >= 1;

  // Una sola llamada para todo el catálogo: devuelve los ids ocupados en el rango.
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matching = cars.filter(
      (c) =>
        (category === 'TODAS' || c.category === category) &&
        (fuels.length === 0 || fuels.includes(c.fuel)) &&
        (!term || `${c.brand} ${c.model}`.toLowerCase().includes(term)) &&
        (!onlyAvailable || reasonFor(c.id, c.availability, datesValid, occupied) === null),
    );
    // Los no disponibles se muestran igual, pero al final.
    return matching.sort(
      (a, b) =>
        Number(reasonFor(a.id, a.availability, datesValid, occupied) !== null) -
        Number(reasonFor(b.id, b.availability, datesValid, occupied) !== null),
    );
  }, [cars, category, fuels, search, onlyAvailable, occupied, datesValid]);

  const availableCount = filtered.filter(
    (c) => reasonFor(c.id, c.availability, datesValid, occupied) === null,
  ).length;

  const hasFilters = category !== 'TODAS' || fuels.length > 0 || onlyAvailable || search !== '';

  const clearFilters = () => {
    setCategory('TODAS');
    setFuels([]);
    setOnlyAvailable(false);
    setSearch('');
  };

  const toggleFuel = (f: Fuel) =>
    setFuels((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const onStartChange = (next: string) => {
    setStartDate(next);
    // Si la devolución quedó antes del nuevo retiro, se corre un día después
    if (next && endDate && daysBetween(next, endDate) < 1) setEndDate(addDays(next, 1));
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

  const scrollToCatalog = () =>
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      {/* ---------- Banner + selección de fechas ---------- */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <h1>
              Arrienda el auto justo, <span>sin vueltas.</span>
            </h1>
            <p className="home-hero__lead">
              Revisa la flota disponible, elige tus fechas y conoce el total antes de confirmar.
            </p>
            <ul className="home-hero__points">
              {['Total claro', 'Disponibilidad real', 'Reserva en minutos'].map((p) => (
                <li key={p}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="home-book">
            <h2>Reserva tu auto</h2>

            <div className="home-field">
              <label htmlFor="home-start">Retiro</label>
              <input
                id="home-start"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div className="home-field">
              <label htmlFor="home-end">Devolución</label>
              <input
                id="home-end"
                type="date"
                min={startDate ? addDays(startDate, 1) : addDays(today, 1)}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="home-field">
              <label htmlFor="home-category">Categoría</label>
              <select
                id="home-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              >
                <option value="TODAS">Todas</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <p className="home-book__hint" aria-live="polite">{datesHint()}</p>

            {(startDate || endDate) && (
              <button
                type="button"
                className="home-book__clear"
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                Limpiar fechas
              </button>
            )}

            <button type="button" className="btn-amber" onClick={scrollToCatalog}>
              Ver autos disponibles
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Catálogo ---------- */}
      <section id="catalogo" className="home-catalog">
        <div className="home-catalog__intro">
          <div>
            <h2>Catálogo de autos</h2>
            <p>Tarifas diarias en pesos chilenos. El total se calcula según los días del arriendo.</p>
          </div>
          <div className="home-search">
            <label htmlFor="home-search">Buscar</label>
            <input
              id="home-search"
              type="search"
              placeholder="Marca o modelo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="home-catalog__body">
          <aside className="home-filters" aria-label="Filtros">
            <div className="home-filters__head">
              <span>Filtros</span>
              {hasFilters && (
                <button type="button" onClick={clearFilters}>Limpiar</button>
              )}
            </div>

            <fieldset className="home-filter">
              <legend>Categoría</legend>
              {(['TODAS', ...CATEGORIES] as CategoryFilter[]).map((c) => (
                <label key={c} className="home-check">
                  <input
                    type="radio"
                    name="home-category-filter"
                    checked={category === c}
                    onChange={() => setCategory(c)}
                  />
                  {c === 'TODAS' ? 'Todas' : CATEGORY_LABELS[c]}
                </label>
              ))}
            </fieldset>

            <fieldset className="home-filter">
              <legend>Combustible</legend>
              {FUELS.map((f) => (
                <label key={f} className="home-check">
                  <input
                    type="checkbox"
                    checked={fuels.includes(f)}
                    onChange={() => toggleFuel(f)}
                  />
                  {FUEL_LABELS[f]}
                </label>
              ))}
            </fieldset>

            <label className="home-switch">
              Solo disponibles
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={() => setOnlyAvailable((v) => !v)}
              />
            </label>
          </aside>

          <div className="home-results">
            {!loading && !error && (
              <p className="home-results__count">
                <strong>{filtered.length} {filtered.length === 1 ? 'auto' : 'autos'}</strong> encontrados
              </p>
            )}

            {loading && <p className="home-state">Cargando autos…</p>}

            {error && (
              <div className="home-state home-state--error" role="alert">
                <p>{error.message}. Revisa que el api-gateway y car-service estén levantados.</p>
                <button type="button" className="btn-primary" onClick={() => refetch()}>Reintentar</button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <p className="home-state">No hay autos que coincidan con estos filtros.</p>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="home-grid">
                {filtered.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    unavailableReason={reasonFor(car.id, car.availability, datesValid, occupied)}
                    startDate={datesValid ? startDate : undefined}
                    endDate={datesValid ? endDate : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}