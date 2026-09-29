import type { Car } from '../types/car';

interface Props {
  car: Car;
  size: 'card' | 'hero';
}

// Muestra la foto de Pexels con su crédito, o la silueta si el auto no tiene imagen.
export default function CarPhoto({ car, size }: Props) {
  return (
    <div className={`car-photo car-photo--${size}`}>
      {car.imageUrl ? (
        <>
          <img
            src={car.imageUrl}
            alt={`${car.brand} ${car.model}`}
            loading="lazy"
          />
          {car.imagePhotographer && (
            <a
              className="car-photo__credit"
              href={car.imageSourceUrl ?? 'https://www.pexels.com'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Foto de {car.imagePhotographer} en Pexels
            </a>
          )}
        </>
      ) : (
        <svg viewBox="0 0 120 56" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 40V31c0-4 3-7 9-8l19-3 13-10c2-1 5-2 8-2h22c4 0 7 1 10 4l10 8 9 2c5 1 8 4 8 8v10" />
          <path d="M8 40h12M44 40h34M102 40h10" />
          <circle cx="32" cy="40" r="10" />
          <circle cx="90" cy="40" r="10" />
          <path d="M42 20l10-9h14v9zM72 20v-9h12l10 9z" />
        </svg>
      )}
    </div>
  );
}