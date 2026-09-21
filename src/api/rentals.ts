import type { RentalRequest, RentalResponse } from '../types/rental';

const BASE = '/api/rentals';

// Intenta leer el mensaje de la excepción (InvalidRentalException, etc.).
// Spring solo incluye "message" en el cuerpo si está habilitado o si hay un @ControllerAdvice.
async function toError(res: Response, fallback: string): Promise<Error> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body.message || body.error || '';
  } catch {
    // cuerpo vacío o no JSON: se usa el mensaje genérico
  }
  return new Error(detail || `${fallback} (HTTP ${res.status})`);
}

// POST /api/rentals
export async function createRental(dto: RentalRequest): Promise<RentalResponse> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await toError(res, 'No se pudo crear el arriendo');
  return res.json() as Promise<RentalResponse>;
}