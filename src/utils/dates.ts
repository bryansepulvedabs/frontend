// src/utils/dates.ts
// Fechas como strings "YYYY-MM-DD" (igual que LocalDate en el backend), construyendo
// siempre Date con constructor local para no correr un día por zona horaria.

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
};

export const daysBetween = (start: string, end: string) => {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

// "2026-09-29" y nada mas: sirve para validar lo que llega por querystring
export const isISODate = (value: string | null): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);