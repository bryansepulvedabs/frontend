// Coincide con rent_a_car_bryan.userservice.entity.EnumRole
export type Role = 'ADMIN' | 'CLIENT' | 'EMPLOYEE';

export interface LoginRequest {
  email: string;
  password: string;
}

// Coincide con LoginResponseDTO
export interface AuthUser {
  token: string;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}