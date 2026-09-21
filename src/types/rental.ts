// Refleja los DTO de rent_a_car_bryan.rentalservice.dto
// LocalDate viaja como string ISO "YYYY-MM-DD".

export type RentalState = 'PENDIENTE' | 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';

export interface RentalRequest {
  carId: number;
  userId: number;
  startDate: string;
  endDate: string;
}

export interface CarInfo {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  dailyRate: number;
}

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface RentalResponse {
  id: number;
  car: CarInfo;
  user: UserInfo;
  startDate: string;
  endDate: string;
  status: RentalState;
  totalPrice: number;
}

export const STATUS_LABELS: Record<RentalState, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};