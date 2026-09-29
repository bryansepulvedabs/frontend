import type { Car } from '../types/car';
import { authFetch, parseJsonOrThrow } from './http';

const BASE = '/api/cars';

// GET /api/cars
export async function getCars(): Promise<Car[]> {
  const res = await authFetch(BASE);
  return parseJsonOrThrow<Car[]>(res, 'la lista de autos');
}

// GET /api/cars/{id}
export async function getCarById(id: number): Promise<Car> {
  const res = await authFetch(`${BASE}/${id}`);
  return parseJsonOrThrow<Car>(res, `el auto ${id}`);
}

// Datos que administra el formulario de la flota (subconjunto de Car, sin id ni disponibilidad)
export interface CarRequest {
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  category: Car['category'];
  fuel: Car['fuel'];
  seats: number;
  mileage: number;
  dailyRate: number;
}

// POST /api/cars — requiere rol ADMIN
export async function createCar(dto: CarRequest): Promise<Car> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<Car>(res, 'No se pudo crear el auto');
}

// PUT /api/cars/{id} — requiere rol ADMIN
export async function updateCar(id: number, dto: CarRequest): Promise<Car> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<Car>(res, 'No se pudo actualizar el auto');
}

// DELETE /api/cars/{id} — requiere rol ADMIN
export async function deleteCar(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  await parseJsonOrThrow<void>(res, 'No se pudo eliminar el auto');
}

// PATCH /api/cars/{id}/availability?available=true|false — requiere rol ADMIN
export async function updateCarAvailability(id: number, available: boolean): Promise<Car> {
  const res = await authFetch(`${BASE}/${id}/availability?available=${available}`, {
    method: 'PATCH',
  });
  return parseJsonOrThrow<Car>(res, 'No se pudo cambiar la disponibilidad');
}