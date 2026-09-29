import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createRental } from '../api/rentals';
import { getCars } from '../api/cars';
import { getUserByRut } from '../api/users';
import { formatCLP } from '../types/car';
import type { User } from '../types/user';
import './NewRentalForm.css';

// ---- utilidades de fecha (mismas reglas que CarDetailPage) ----
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISO(new Date(y, m - 1, d + n));
};

const daysBetween = (start: string, end: string) => {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};

interface Props {
  // Si viene un cliente prefijado (ficha del cliente), no se muestra la búsqueda por RUT
  client?: User;
  onCreated: () => void;
}

export default function NewRentalForm({ client: fixedClient, onCreated }: Props) {
  const [rut, setRut] = useState('');
  const [foundClient, setFoundClient] = useState<User | null>(null);
  const [carId, setCarId] = useState<number | ''>('');

  const today = toISO(new Date());
  const [startDate, setStartDate] = useState(addDays(today, 1));
  const [endDate, setEndDate] = useState(addDays(today, 4));

  const client = fixedClient ?? foundClient;

  const { data: cars = [] } = useQuery({ queryKey: ['cars'], queryFn: getCars });
  const availableCars = cars.filter((c) => c.availability);

  const searchMutation = useMutation({
    mutationFn: getUserByRut,
    onSuccess: (found) => setFoundClient(found),
    onError: () => setFoundClient(null),
  });

  const createMutation = useMutation({
    mutationFn: createRental,
    onSuccess: onCreated,
  });

  const days = daysBetween(startDate, endDate);
  const selectedCar = availableCars.find((c) => c.id === carId);
  const canSubmit = !!client && !!selectedCar && days >= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCar || !client || days < 1) return;
    createMutation.mutate({ carId: selectedCar.id, userId: client.id, startDate, endDate });
  };

  return (
    <form className="new-rental" onSubmit={submit}>
      {fixedClient ? (
        <div className="new-rental__fixed-client">
          <span className="new-rental__label">Cliente</span>
          <p className="new-rental__client-name">{fixedClient.firstName} {fixedClient.lastName}</p>
          <p className="new-rental__client-meta mono">{fixedClient.rut}</p>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="rut">RUT del cliente</label>
          <div className="new-rental__rut-row">
            <input
              id="rut"
              placeholder="18.345.672-9"
              value={rut}
              onChange={(e) => {
                setRut(e.target.value);
                setFoundClient(null);
              }}
            />
            <button
              type="button"
              className="btn-dark"
              disabled={!rut || searchMutation.isPending}
              onClick={() => searchMutation.mutate(rut)}
            >
              {searchMutation.isPending ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {foundClient && (
            <p className="new-rental__found">
              ✓ {foundClient.firstName} {foundClient.lastName} · {foundClient.email}
            </p>
          )}
          {searchMutation.isError && !foundClient && (
            <p className="new-rental__error">{searchMutation.error.message}</p>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="new-car">Auto</label>
        <select id="new-car" value={carId} onChange={(e) => setCarId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Selecciona un auto disponible</option>
          {availableCars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brand} {c.model} · {c.licensePlate} · {formatCLP(c.dailyRate)}/día
            </option>
          ))}
        </select>
      </div>

      <div className="new-rental__dates">
        <div className="field">
          <label htmlFor="new-start">Retiro</label>
          <input id="new-start" type="date" min={today} value={startDate}
            onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="new-end">Devolución</label>
          <input id="new-end" type="date" min={addDays(startDate, 1)} value={endDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {selectedCar && days >= 1 && (
        <p className="new-rental__estimate">
          Total estimado: <strong>{formatCLP(selectedCar.dailyRate * days)}</strong>
          {' '}({days} {days === 1 ? 'día' : 'días'})
        </p>
      )}

      {createMutation.isError && (
        <p className="new-rental__error">{createMutation.error.message}</p>
      )}

      <button type="submit" className="btn-primary" disabled={!canSubmit || createMutation.isPending}>
        {createMutation.isPending ? 'Creando…' : 'Crear arriendo'}
      </button>
    </form>
  );
}