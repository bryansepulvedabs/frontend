import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

function Tick() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

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
  const [search, setSearch] = useState('');

  // Fechas opcionales: sin fechas el catálogo muestra todo lo operativo, igual que antes.
  const today = todayISO();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Al llegar desde otra página con "/#catalogo" (menú del encabezado), baja al catálogo.
  // Se escucha location.key para que también funcione si ya estabas en la landing.
  const location = useLocation();
  useEffect(() => {
    if (location.hash === '#catalogo') {
      document.getElementById('catalogo')?.scrollIntoView();
    }
  }, [location.key, location.hash]);

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

  const term = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const matching = cars.filter(
      (c) =>
        (category === 'TODAS' || c.category === category) &&
        (fuel === 'TODOS' || c.fuel === fuel) &&
        (!term || `${c.brand} ${c.model}`.toLowerCase().includes(term)) &&
        (!onlyAvailable || reasonFor(c.id, c.availability) === null),
    );
    // Los no disponibles se muestran igual, pero al final: el usuario ve que el auto
    // existe y puede probar otras fechas.
    return matching.sort(
      (a, b) =>
        Number(reasonFor(a.id, a.availability) !== null) -
        Number(reasonFor(b.id, b.availability) !== null),
    );
  }, [cars, category, fuel, term, onlyAvailable, occupied, datesValid]);

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
    <>
      {/* ---------- Banner con selección de fechas ---------- */}
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <h1>
              Arrienda el auto justo, <span>sin vueltas.</span>
            </h1>
            <p>Revisa la flota disponible, elige tus fechas y conoce el total antes de confirmar.</p>
            <ul className="hero__ticks">
              <li><Tick />Total claro</li>
              <li><Tick />Disponibilidad real</li>
              <li><Tick />Reserva en minutos</li>
            </ul>
          </div>

          <div className="hero__card">
            <h2>Reserva tu auto</h2>

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

            <div className="field">
              <label htmlFor="hero-category">Categoría</label>
              <select
                id="hero-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              >
                <option value="TODAS">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <p className="hero__hint" aria-live="polite">{datesHint()}</p>

            {(startDate || endDate) && (
              <button type="button" className="hero__clear" onClick={clearDates}>
                Limpiar fechas
              </button>
            )}

            <a href="#catalogo" className="btn-amber">Ver autos disponibles</a>
          </div>
        </div>
      </section>

      {/* ---------- Catálogo ---------- */}
      <section className="catalog" id="catalogo">
        <div className="catalog__head">
          <div>
            <h2>Catálogo de autos</h2>
            <p>Tarifas diarias en pesos chilenos. El total se calcula según los días del arriendo.</p>
          </div>
          <div className="catalog__search">
            <label htmlFor="catalog-search">Buscar</label>
            <input
              id="catalog-search"
              type="search"
              placeholder="Marca o modelo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="catalog__layout">
          <aside className="catalog__filters" aria-label="Filtros del catálogo">
            <h3>Filtros</h3>

            <fieldset className="filters__group">
              <legend>Categoría</legend>
              <label className="filters__option">
                <input type="radio" name="category" checked={category === 'TODAS'}
                  onChange={() => setCategory('TODAS')} />
                Todas
              </label>
              {categories.map((c) => (
                <label key={c} className="filters__option">
                  <input type="radio" name="category" checked={category === c}
                    onChange={() => setCategory(c)} />
                  {CATEGORY_LABELS[c]}
                </label>
              ))}
            </fieldset>

            <fieldset className="filters__group">
              <legend>Combustible</legend>
              <label className="filters__option">
                <input type="radio" name="fuel" checked={fuel === 'TODOS'}
                  onChange={() => setFuel('TODOS')} />
                Todos
              </label>
              {fuels.map((f) => (
                <label key={f} className="filters__option">
                  <input type="radio" name="fuel" checked={fuel === f}
                    onChange={() => setFuel(f)} />
                  {FUEL_LABELS[f]}
                </label>
              ))}
            </fieldset>

            <label className="catalog__toggle">
              Solo disponibles
              <input type="checkbox" checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)} />
            </label>
          </aside>

          <div className="catalog__results">
            {!loading && !error && (
              <p className="catalog__count">
                <strong>{filtered.length} {filtered.length === 1 ? 'auto' : 'autos'}</strong>{' '}
                {filtered.length === 1 ? 'encontrado' : 'encontrados'}
              </p>
            )}

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
          </div>
        </div>
      </section>
    </>
  );
}