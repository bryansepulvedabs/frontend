export type Category =
  | 'SEDAN'
  | 'SUV'
  | 'HATCHBACK'
  | 'PICKUP'
  | 'VAN'
  | 'DEPORTIVO'
  | 'CITYCAR';

export type Fuel = 'GASOLINA' | 'DIESEL' | 'ELECTRICO' | 'HIBRIDO';

export interface Car {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  category: Category;
  fuel: Fuel;
  seats: number;
  mileage: number;
  availability: boolean;
  dailyRate: number; // Long en CLP
}

export const CATEGORY_LABELS: Record<Category, string> = {
  SEDAN: 'Sedán',
  SUV: 'SUV',
  HATCHBACK: 'Hatchback',
  PICKUP: 'Pickup',
  VAN: 'Van',
  DEPORTIVO: 'Deportivo',
  CITYCAR: 'Citycar',
};

export const FUEL_LABELS: Record<Fuel, string> = {
  GASOLINA: 'Gasolina',
  DIESEL: 'Diésel',
  ELECTRICO: 'Eléctrico',
  HIBRIDO: 'Híbrido',
};

export const formatCLP = (value: number): string =>
  '$' + value.toLocaleString('es-CL');