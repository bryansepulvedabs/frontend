import type { RentalRequest, RentalResponse, RentalState } from '../types/rental';
import { authFetch, parseJsonOrThrow } from './http';

const BASE = '/api/rentals';

// POST /api/rentals — exige sesión: si es CLIENT el userId sale del token (se ignora
// el del body); si es ADMIN o EMPLOYEE puede crear el arriendo a nombre de un cliente
export async function createRental(dto: RentalRequest): Promise<RentalResponse> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudo crear el arriendo');
}

// GET /api/rentals/availability?carId=&startDate=&endDate= — público
// Dice si el auto está libre en ese rango. La disponibilidad depende de las fechas:
// un auto arrendado del 10 al 18 sí se puede arrendar del 20 al 25.
export async function isCarAvailable(
  carId: number,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const params = new URLSearchParams({ carId: String(carId), startDate, endDate });
  const res = await authFetch(`${BASE}/availability?${params}`);
  return parseJsonOrThrow<boolean>(res, 'la disponibilidad del auto');
}

// GET /api/rentals/occupied?startDate=&endDate= — público
// Ids de los autos ocupados en el rango, en una sola llamada: el catálogo pide esta
// lista una vez y filtra, en vez de preguntar auto por auto.
export async function getOccupiedCarIds(startDate: string, endDate: string): Promise<number[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const res = await authFetch(`${BASE}/occupied?${params}`);
  return parseJsonOrThrow<number[]>(res, 'los autos ocupados');
}

// GET /api/rentals — listado para el backoffice
export async function getAllRentals(): Promise<RentalResponse[]> {
  const res = await authFetch(BASE);
  return parseJsonOrThrow<RentalResponse[]>(res, 'la lista de arriendos');
}

// GET /api/rentals/user/{userId} — arriendos del cliente logueado, para "Mis arriendos"
export async function getRentalsByUserId(userId: number): Promise<RentalResponse[]> {
  const res = await authFetch(`${BASE}/user/${userId}`);
  return parseJsonOrThrow<RentalResponse[]>(res, 'tus arriendos');
}

// PATCH /api/rentals/{id}/status?newStatus=... — requiere ADMIN o EMPLOYEE
export async function updateRentalStatus(id: number, newStatus: RentalState): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/${id}/status?newStatus=${newStatus}`, {
    method: 'PATCH',
  });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudo actualizar el estado del arriendo');
}

// DELETE /api/rentals/{id} — requiere ADMIN o EMPLOYEE
export async function deleteRental(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  await parseJsonOrThrow<void>(res, 'No se pudo eliminar el arriendo');
}