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

// GET /api/rentals/deleted — requiere rol ADMIN
export async function getDeletedRentals(): Promise<RentalResponse[]> {
  const res = await authFetch(`${BASE}/deleted`);
  return parseJsonOrThrow<RentalResponse[]>(res, 'los arriendos eliminados');
}

// GET /api/rentals/{id} — ficha del arriendo en el backoffice (ADMIN o EMPLOYEE)
export async function getRentalById(id: number): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/${id}`);
  return parseJsonOrThrow<RentalResponse>(res, 'el arriendo');
}

// GET /api/rentals/admin/{id} — requiere rol ADMIN
// Ficha del backoffice: devuelve el arriendo aunque esté eliminado (deleted = true)
export async function getRentalAdmin(id: number): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/admin/${id}`);
  return parseJsonOrThrow<RentalResponse>(res, 'el arriendo');
}

// GET /api/rentals/user/{userId} — arriendos del cliente logueado, para "Mis arriendos"
export async function getRentalsByUserId(userId: number): Promise<RentalResponse[]> {
  const res = await authFetch(`${BASE}/user/${userId}`);
  return parseJsonOrThrow<RentalResponse[]>(res, 'tus arriendos');
}

// GET /api/rentals/car/{carId} — historial de un auto, para la ficha administrativa
export async function getRentalsByCarId(carId: number): Promise<RentalResponse[]> {
  const res = await authFetch(`${BASE}/car/${carId}`);
  return parseJsonOrThrow<RentalResponse[]>(res, 'los arriendos del auto');
}

// PATCH /api/rentals/{id}/status?newStatus=... — requiere ADMIN o EMPLOYEE
export async function updateRentalStatus(id: number, newStatus: RentalState): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/${id}/status?newStatus=${newStatus}`, {
    method: 'PATCH',
  });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudo actualizar el estado del arriendo');
}

// PATCH /api/rentals/{id}/dates — requiere ADMIN o EMPLOYEE
// PENDIENTE: se mueven retiro y devolución. ACTIVO: solo la devolución.
// El total se recalcula en el servidor con la tarifa del arriendo original.
export async function updateRentalDates(
  id: number,
  dates: { startDate: string; endDate: string },
): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/${id}/dates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dates),
  });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudieron cambiar las fechas del arriendo');
}

// DELETE /api/rentals/{id} — requiere ADMIN o EMPLOYEE (borrado lógico: se puede reactivar)
export async function deleteRental(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  await parseJsonOrThrow<void>(res, 'No se pudo eliminar el arriendo');
}

// PATCH /api/rentals/{id}/restore — requiere rol ADMIN
// Falla con 400 si el auto ya fue arrendado en esas fechas mientras estaba eliminado
export async function restoreRental(id: number): Promise<RentalResponse> {
  const res = await authFetch(`${BASE}/${id}/restore`, { method: 'PATCH' });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudo reactivar el arriendo');
}