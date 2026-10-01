import type { User, UserRequest } from '../types/user';
import { authFetch, parseJsonOrThrow } from './http';

const BASE = '/api/users';

// Datos del formulario de registro público. No lleva `role`: el rol lo decide el
// servidor (siempre CLIENT cuando no hay un ADMIN autenticado detrás), así que
// mandarlo desde acá no serviría de nada.
export type RegisterRequest = Omit<UserRequest, 'role'> & { password: string };

// POST /api/users — público, registro de cuenta nueva
export async function registerUser(dto: RegisterRequest): Promise<User> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseJsonOrThrow<User>(res, 'No se pudo crear la cuenta');
}

// GET /api/users — requiere rol ADMIN
export async function getUsers(): Promise<User[]> {
  const res = await authFetch(BASE);
  return parseJsonOrThrow<User[]>(res, 'la lista de usuarios');
}

// GET /api/users/deleted — requiere rol ADMIN
export async function getDeletedUsers(): Promise<User[]> {
  const res = await authFetch(`${BASE}/deleted`);
  return parseJsonOrThrow<User[]>(res, 'los usuarios eliminados');
}

// GET /api/users/rut/{rut} — requiere rol ADMIN o EMPLOYEE (buscar un cliente puntual, ej. en el mostrador)
export async function getUserByRut(rut: string): Promise<User> {
  const res = await authFetch(`${BASE}/rut/${encodeURIComponent(rut)}`);
  return parseJsonOrThrow<User>(res, 'ese cliente');
}

// GET /api/users/{id} — requiere rol ADMIN
export async function getUser(id: number): Promise<User> {
  const res = await authFetch(`${BASE}/${id}`);
  return parseJsonOrThrow<User>(res, 'el detalle del usuario');
}

// GET /api/users/admin/{id} — requiere rol ADMIN
// Ficha del backoffice: devuelve al usuario aunque esté eliminado (deleted = true)
export async function getUserAdmin(id: number): Promise<User> {
  const res = await authFetch(`${BASE}/admin/${id}`);
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

// PATCH /api/users/{id}/restore — requiere rol ADMIN
export async function restoreUser(id: number): Promise<User> {
  const res = await authFetch(`${BASE}/${id}/restore`, { method: 'PATCH' });
  return parseJsonOrThrow<User>(res, 'No se pudo reactivar el usuario');
}