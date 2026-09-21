import { Link } from 'react-router-dom';
import type { Car } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../types/car';

interface Props {
  car: Car;
}

export default function CarCard({ car }: Props) {
  return (
    <article className="car-card">
      <div className="car-card__media">
        <CarSilhouette />
        <span className="car-card__plate">{car.licensePlate}</span>
      </div>

      <div className="car-card__body">
        <div className="car-card__head">
          <div>
            <p className="car-card__brand">{car.brand}</p>
            <h3 className="car-card__model">{car.model}</h3>
          </div>
          {car.availability ? (
            <span className="badge badge--ok">Disponible</span>
          ) : (
            <span className="badge badge--off">Arrendado</span>
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
          {car.availability ? (
            <Link to={`/autos/${car.id}`} className="btn-primary">Arrendar</Link>
          ) : (
            <span className="car-card__unavailable">No disponible</span>
          )}
        </div>
      </div>
    </article>
  );
}

function CarSilhouette() {
  return (
    <svg width="150" height="70" viewBox="0 0 120 56" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 40V31c0-4 3-7 9-8l19-3 13-10c2-1 5-2 8-2h22c4 0 7 1 10 4l10 8 9 2c5 1 8 4 8 8v10" />
      <path d="M8 40h12M44 40h34M102 40h10" />
      <circle cx="32" cy="40" r="10" />
      <circle cx="90" cy="40" r="10" />
      <path d="M42 20l10-9h14v9zM72 20v-9h12l10 9z" />
    </svg>
  );
}