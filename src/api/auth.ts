import type { AuthUser, LoginRequest } from '../types/auth';
import { authFetch, parseJsonOrThrow } from './http';

// POST /api/auth/login
export async function login(credentials: LoginRequest): Promise<AuthUser> {
  const res = await authFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return parseJsonOrThrow<AuthUser>(res, 'No se pudo iniciar sesión');
}