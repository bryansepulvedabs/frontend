import { Link } from 'react-router-dom';
import CarPhoto from './CarPhoto';
import type { Car } from '../types/car';
import { CATEGORY_LABELS, FUEL_LABELS, formatCLP } from '../types/car';

interface Props {
  car: Car;
}

export default function CarCard({ car }: Props) {
  return (
    <article className="car-card">
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