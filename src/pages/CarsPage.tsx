import { useQuery } from '@tanstack/react-query';
import { fetchCars } from '../api/cars';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default function CarsPage() {
  const { data: cars, isLoading, isError, error } = useQuery({
    queryKey: ['cars'],
    queryFn: fetchCars,
  });

  if (isLoading) return <p>Cargando autos...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Catálogo de autos</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >
        {cars?.map((car) => (
          <article
            key={car.id}
            style={{ border: '1px solid #ccc', borderRadius: 8, padding: '1rem', textAlign: 'left' }}
          >
            <h2 style={{ margin: 0 }}>{car.brand} {car.model}</h2>
            <p>{car.year} · {car.color} · {car.licensePlate}</p>
            <p>{car.category} · {car.fuel} · {car.seats} asientos</p>
            <p><strong>{clp.format(car.dailyRate)}</strong> / día</p>
            <p>{car.availability ? 'Disponible' : 'No disponible'}</p>
          </article>
        ))}
      </div>
    </main>
  );
}