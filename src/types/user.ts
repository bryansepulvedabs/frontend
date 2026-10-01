import type { Role } from './auth';

// Coincide con UserResponseDTO (nota: el backend serializa el campo como "role")
export interface User {
  id: number;
  rut: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  role: Role;
  // true si el usuario está dado de baja (solo lo devuelve el endpoint de admin)
  deleted?: boolean;
}

// Coincide con UserRequestDTO. password es opcional al editar: si se omite, no cambia.
export interface UserRequest {
  rut: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  role: Role;
}