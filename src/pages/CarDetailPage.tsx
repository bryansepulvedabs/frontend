import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCarById } from '../api/cars';
import { createRental } from '../api/rentals';
import type { Car } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../types/car';
import { STATUS_LABELS } from '../types/rental';
import './CarDetailPage.css';

// TODO: reemplazar por el id del usuario autenticado cuando exista login con JWT.
// Usa el id de un usuario que exista en el data.sql de user-service.
const DEMO_USER_ID = 1;

// ---- utilidades de fecha (strings "YYYY-MM-DD", sin problemas de zona horaria) ----
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
};

const daysBetween = (start: string, end: string) => {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
        <div className="detail__media">
          <svg width="320" height="150" viewBox="0 0 120 56" fill="none" stroke="currentColor"
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 40V31c0-4 3-7 9-8l19-3 13-10c2-1 5-2 8-2h22c4 0 7 1 10 4l10 8 9 2c5 1 8 4 8 8v10" />
            <path d="M8 40h12M44 40h34M102 40h10" />
            <circle cx="32" cy="40" r="10" />
            <circle cx="90" cy="40" r="10" />
            <path d="M42 20l10-9h14v9zM72 20v-9h12l10 9z" />
          </svg>
        </div>
        <dl className="detail__specs">
          <div><dt>Patente</dt><dd className="mono">{car.licensePlate}</dd></div>
          <div><dt>Categoría</dt><dd>{CATEGORY_LABELS[car.category]}</dd></div>
          <div><dt>Combustible</dt><dd>{FUEL_LABELS[car.fuel]}</dd></div>
          <div><dt>Año</dt><dd>{car.year}</dd></div>
          <div><dt>Asientos</dt><dd>{car.seats}</dd></div>
          <div><dt>Color</dt><dd>{car.color}</dd></div>
          <div><dt>Kilometraje</dt><dd>{car.mileage.toLocaleString('es-CL')} km</dd></div>
        </dl>
      </div>

      <BookingPanel car={car} />
    </section>
  );
}

function BookingPanel({ car }: { car: Car }) {
  const today = toISO(new Date());
  const [startDate, setStartDate] = useState(addDays(today, 1));
  const [endDate, setEndDate] = useState(addDays(today, 4));

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createRental,
    onSuccess: () => {
      // la disponibilidad del auto cambió en car-service
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['car', car.id] });
    },
  });

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

  if (!car.availability) {
    return (
      <aside className="booking">
        <h2 className="booking__title">No disponible</h2>
        <p className="booking__note">Este auto está arrendado. Elige otro desde el catálogo.</p>
        <Link to="/" className="btn-primary">Ver otros autos</Link>
      </aside>
    );
  }

  const days = daysBetween(startDate, endDate);
  const datesError =
    startDate < today
      ? 'La fecha de retiro no puede ser anterior a hoy.'
      : days < 1
        ? 'La fecha de devolución debe ser posterior a la de retiro.'
        : null;

  const shiftEnd = (n: number) => {
    const next = addDays(endDate, n);
    if (daysBetween(startDate, next) >= 1) setEndDate(next);
  };

  const submit = () => {
    if (datesError) return;
    mutation.mutate({ carId: car.id, userId: DEMO_USER_ID, startDate, endDate });
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
        disabled={!!datesError || mutation.isPending} onClick={submit}>
        {mutation.isPending ? 'Creando arriendo…' : 'Confirmar arriendo'}
      </button>
      <p className="booking__note">
        Al confirmar, el auto queda como no disponible hasta que el arriendo se finalice o cancele.
      </p>
    </aside>
  );
}