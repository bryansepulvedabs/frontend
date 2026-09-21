import type { Car } from '../types/car';

const BASE = '/api/cars';

async function handle<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`No se pudo obtener ${what} (HTTP ${res.status})`);
  }
  return res.json() as Promise<T>;
}

// GET /api/cars
export async function getCars(): Promise<Car[]> {
  const res = await fetch(BASE);
  return handle<Car[]>(res, 'la lista de autos');
}

// GET /api/cars/{id}
export async function getCarById(id: number): Promise<Car> {
  const res = await fetch(`${BASE}/${id}`);
  return handle<Car>(res, `el auto ${id}`);
}