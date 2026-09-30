import { Link } from 'react-router-dom';
import CarPhoto from './CarPhoto';
import type { Car } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../types/car';

// 'maintenance' = el auto está fuera de servicio (availability = false), da igual la fecha.
// 'booked'      = está arrendado justo en el periodo elegido; en otras fechas sí se puede.
// null          = se puede arrendar.
export type UnavailableReason = 'maintenance' | 'booked' | null;

interface Props {
  car: Car;
  unavailableReason?: UnavailableReason;
  // Fechas elegidas en el catálogo: se pasan al detalle para no hacer elegirlas dos veces
  startDate?: string;
  endDate?: string;
}

export default function CarCard({ car, unavailableReason = null, startDate, endDate }: Props) {
  const detailUrl =
    startDate && endDate
      ? `/autos/${car.id}?${new URLSearchParams({ startDate, endDate })}`
      : `/autos/${car.id}`;

  return (
    <article className={`car-card${unavailableReason ? ' car-card--off' : ''}`}>
      <div className="car-card__media">
        <CarPhoto car={car} size="card" />
        <span className="car-card__plate">{car.licensePlate}</span>
      </div>

      <div className="car-card__body">
        <div className="car-card__head">
          <div>
            <p className="car-card__brand">{car.brand}</p>
            <h3 className="car-card__model">{car.model}</h3>
          </div>
          {unavailableReason === 'maintenance' ? (
            <span className="badge badge--off">En mantención</span>
          ) : unavailableReason === 'booked' ? (
            <span className="badge badge--off">Arrendado</span>
          ) : (
            <span className="badge badge--ok">Disponible</span>
          )}
        </div>

        <ul className="car-card__specs">
          <li>{CATEGORY_LABELS[car.category]}</li>
          <li>{FUEL_LABELS[car.fuel]}</li>
          <li>{car.year}</li>
          <li>{car.seats} asientos</li>
        </ul>

        <div className="car-card__foot">
          <div>
            <p className="car-card__rate">{formatCLP(car.dailyRate)}</p>
            <p className="car-card__per">por día</p>
          </div>
          {unavailableReason === 'maintenance' ? (
            <span className="car-card__unavailable">No disponible</span>
          ) : unavailableReason === 'booked' ? (
            <span className="car-card__unavailable">Ocupado esas fechas</span>
          ) : (
            <Link to={detailUrl} className="btn-primary">Arrendar</Link>
          )}
        </div>
      </div>
    </article>
  );
}