import type { RentalRequest, RentalResponse, RentalState } from '../types/rental';
import { authFetch, parseJsonOrThrow } from './http';

const BASE = '/api/rentals';

// POST /api/rentals — público (el cliente aún no inicia sesión para arrendar)
export async function createRental(dto: RentalRequest): Promise<RentalResponse> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<RentalResponse>(res, 'No se pudo crear el arriendo');
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