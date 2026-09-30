import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCarById } from '../api/cars';
import CarPhoto from '../components/CarPhoto';
import { createRental, isCarAvailable } from '../api/rentals';
import { useAuth } from '../context/AuthContext';
import type { Car } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../types/car';
import { STATUS_LABELS } from '../types/rental';
import { addDays, daysBetween, formatDate, isISODate, todayISO } from '../utils/dates';
import './CarDetailPage.css';

export default function CarDetailPage() {
  const { id } = useParams();
  const carId = Number(id);

  const { data: car, isPending, isError, error } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => getCarById(carId),
    enabled: Number.isFinite(carId),
  });

  if (!Number.isFinite(carId)) {
    return <p className="detail__state">La dirección no corresponde a un auto válido.</p>;
  }
  if (isPending) return <p className="detail__state">Cargando auto…</p>;
  if (isError) {
    return (
      <div className="detail__state" role="alert">
        <p>{error.message}</p>
        <Link to="/">Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <section className="detail">
      <div className="detail__info">
        <Link to="/" className="detail__back">← Volver al catálogo</Link>
        <div>
          <p className="detail__brand">{car.brand}</p>
          <h1 className="detail__model">{car.model}</h1>
        </div>
        <CarPhoto car={car} size="hero" />
        <dl className="detail__specs">
          <div><dt>Patente</dt><dd className="mono">{car.licensePlate}</dd></div>
          <div><dt>Categoría</dt><dd>{CATEGORY_LABELS[car.category]}</dd></div>
          <div><dt>Combustible</dt><dd>{FUEL_LABELS[car.fuel]}</dd></div>
          <div><dt>Año</dt><dd>{car.year}</dd></div>
          <div><dt>Asientos</dt><dd>{car.seats}</dd></div>
          <div><dt>Color</dt><dd>{car.color}</dd></div>
          <div><dt>Kilometraje</dt><dd>{car.mileage != null ? `${car.mileage.toLocaleString('es-CL')} km` : '—'}</dd></div>
        </dl>
      </div>

      <BookingPanel car={car} />
    </section>
  );
}

function BookingPanel({ car }: { car: Car }) {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const today = todayISO();

  // Si se llegó desde el catálogo con fechas elegidas, se respetan; si no, un rango por defecto.
  const [startDate, setStartDate] = useState(() => {
    const fromUrl = searchParams.get('startDate');
    return isISODate(fromUrl) && fromUrl >= today ? fromUrl : addDays(today, 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const fromUrl = searchParams.get('endDate');
    const start = searchParams.get('startDate');
    const effectiveStart = isISODate(start) && start >= today ? start : addDays(today, 1);
    return isISODate(fromUrl) && daysBetween(effectiveStart, fromUrl) >= 1
      ? fromUrl
      : addDays(effectiveStart, 3);
  });

  const days = daysBetween(startDate, endDate);
  const datesError =
    startDate < today
      ? 'La fecha de retiro no puede ser anterior a hoy.'
      : days < 1
        ? 'La fecha de devolución debe ser posterior a la de retiro.'
        : null;

  // La disponibilidad ya no es un flag del auto: depende del periodo pedido. Se consulta
  // cada vez que cambian las fechas, para avisar antes de enviar y no después con un 400.
  // Ojo: todos los hooks van antes de los early returns de abajo.
  const availabilityQuery = useQuery({
    queryKey: ['car-availability', car.id, startDate, endDate],
    queryFn: () => isCarAvailable(car.id, startDate, endDate),
    enabled: !datesError && car.availability,
    staleTime: 0,
  });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createRental,
    onSuccess: () => {
      // el auto queda ocupado en ese periodo: se invalidan las consultas de disponibilidad
      queryClient.invalidateQueries({ queryKey: ['car-availability'] });
      queryClient.invalidateQueries({ queryKey: ['occupied-cars'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });

  // Sin sesión no hay a nombre de quién crear el arriendo.
  // Se guarda tambien el querystring para no perder las fechas al volver del login.
  if (!user) {
    return (
      <aside className="booking">
        <h2 className="booking__title">Inicia sesión para arrendar</h2>
        <p className="booking__note">
          Necesitas una cuenta para reservar este auto y después verlo en “Mis arriendos”.
        </p>
        <Link to="/login" state={{ from: location.pathname + location.search }} className="btn-primary">
          Iniciar sesión
        </Link>
      </aside>
    );
  }

  // Confirmación: se muestra con los datos que devolvió rental-service
  if (mutation.isSuccess) {
    const r = mutation.data;
    return (
      <aside className="booking" aria-live="polite">
        <h2 className="booking__title">Arriendo #{r.id} creado</h2>
        <span className={`status status--${r.status.toLowerCase()}`}>{STATUS_LABELS[r.status]}</span>
        <dl className="booking__summary">
          <div><dt>Auto</dt><dd>{r.car.brand} {r.car.model} ({r.car.licensePlate})</dd></div>
          <div><dt>Arrendatario</dt><dd>{r.user.firstName} {r.user.lastName}</dd></div>
          <div><dt>Fechas</dt><dd>{formatDate(r.startDate)} al {formatDate(r.endDate)}</dd></div>
          <div><dt>Total</dt><dd className="booking__total">{formatCLP(r.totalPrice)}</dd></div>
        </dl>
        <Link to="/" className="btn-primary">Volver al catálogo</Link>
      </aside>
    );
  }

  // availability = false ya no significa "arrendado", sino fuera de servicio
  if (!car.availability) {
    return (
      <aside className="booking">
        <h2 className="booking__title">Fuera de servicio</h2>
        <p className="booking__note">
          Este auto está en mantención y no se puede reservar por ahora. Elige otro desde el catálogo.
        </p>
        <Link to="/" className="btn-primary">Ver otros autos</Link>
      </aside>
    );
  }

  const checkingAvailability = !datesError && availabilityQuery.isPending;
  const occupied = availabilityQuery.data === false;

  const shiftEnd = (n: number) => {
    const next = addDays(endDate, n);
    if (daysBetween(startDate, next) >= 1) setEndDate(next);
  };

  const submit = () => {
    if (datesError || occupied || checkingAvailability) return;
    mutation.mutate({ carId: car.id, userId: user.id, startDate, endDate });
  };

  return (
    <aside className="booking">
      <p className="booking__rate">
        <strong>{formatCLP(car.dailyRate)}</strong> por día
      </p>

      <div className="booking__dates">
        <div className="field">
          <label htmlFor="start">Retiro</label>
          <input id="start" type="date" min={today} value={startDate}
            onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="end">Devolución</label>
          <input id="end" type="date" min={addDays(startDate, 1)} value={endDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="booking__days">
        <span>Duración</span>
        <div className="stepper">
          <button type="button" aria-label="Quitar un día" onClick={() => shiftEnd(-1)}>−</button>
          <span>{days >= 1 ? `${days} ${days === 1 ? 'día' : 'días'}` : '—'}</span>
          <button type="button" aria-label="Agregar un día" onClick={() => shiftEnd(1)}>+</button>
        </div>
      </div>

      {datesError && <p className="booking__error" role="alert">{datesError}</p>}

      {!datesError && checkingAvailability && (
        <p className="booking__note">Comprobando disponibilidad…</p>
      )}
      {!datesError && occupied && (
        <p className="booking__error" role="alert">
          El auto ya está arrendado entre esas fechas. Prueba con otro periodo.
        </p>
      )}
      {!datesError && availabilityQuery.data === true && (
        <p className="booking__note" aria-live="polite">
          Disponible del {formatDate(startDate)} al {formatDate(endDate)}.
        </p>
      )}
      {!datesError && availabilityQuery.isError && (
        <p className="booking__note">
          No se pudo comprobar la disponibilidad. Puedes intentar reservar igual.
        </p>
      )}

      <div className="booking__breakdown">
        <div className="row">
          <span>{days >= 1 ? `${formatCLP(car.dailyRate)} × ${days} ${days === 1 ? 'día' : 'días'}` : 'Revisa las fechas'}</span>
          <span>{days >= 1 ? formatCLP(car.dailyRate * days) : '—'}</span>
        </div>
        <div className="row row--total">
          <span>Total estimado</span>
          <span className="booking__total">{days >= 1 ? formatCLP(car.dailyRate * days) : '—'}</span>
        </div>
      </div>

      {mutation.isError && (
        <p className="booking__error" role="alert">{mutation.error.message}</p>
      )}

      <button type="button" className="btn-primary booking__submit"
        disabled={!!datesError || occupied || checkingAvailability || mutation.isPending}
        onClick={submit}>
        {mutation.isPending
          ? 'Creando arriendo…'
          : checkingAvailability
            ? 'Comprobando…'
            : 'Confirmar arriendo'}
      </button>
      <p className="booking__note">
        El auto queda reservado solo en las fechas que elijas; el resto del tiempo sigue disponible
        para otros arriendos.
      </p>
    </aside>
  );
}