import type { User, UserRequest } from '../types/user';
import { authFetch, parseJsonOrThrow } from './http';

const BASE = '/api/users';

// GET /api/users — requiere rol ADMIN
export async function getUsers(): Promise<User[]> {
  const res = await authFetch(BASE);
  return parseJsonOrThrow<User[]>(res, 'la lista de usuarios');
}

// GET /api/users/rut/{rut} — requiere rol ADMIN o EMPLOYEE (buscar un cliente puntual, ej. en el mostrador)
export async function getUserByRut(rut: string): Promise<User> {
  const res = await authFetch(`${BASE}/rut/${encodeURIComponent(rut)}`);
  return parseJsonOrThrow<User>(res, 'ese cliente');
}

// GET /api/users/{id} — requiere rol ADMIN (ficha del cliente en el backoffice)
export async function getUser(id: number): Promise<User> {
  const res = await authFetch(`${BASE}/${id}`);
  return parseJsonOrThrow<User>(res, 'el detalle del usuario');
}

// PUT /api/users/{id} — requiere rol ADMIN
export async function updateUser(id: number, dto: UserRequest): Promise<User> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<User>(res, 'No se pudo actualizar el usuario');
}

// DELETE /api/users/{id} — requiere rol ADMIN
export async function deleteUser(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  await parseJsonOrThrow<void>(res, 'No se pudo eliminar el usuario');
}