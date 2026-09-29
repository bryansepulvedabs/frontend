import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '../../../types/user';

interface CarSummary {
  id: number;
  brand: string;
  model: string;
  plate: string;
  pricePerDay: number;
}

interface RentalDTO {
  customerId: number;
  carId: number;
  startDate: string;
  endDate: string;
}

interface RentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedUser?: User;
}

export function RentalModal({ isOpen, onClose, preselectedUser }: RentalModalProps) {
  const queryClient = useQueryClient();
  const [selectedCarId, setSelectedCarId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Obtener autos desde car-service
  const { data: cars = [], isPending: isLoadingCars } = useQuery<CarSummary[]>({
    queryKey: ['availableCars'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cars/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error cargando autos');
      return res.json();
    },
    enabled: isOpen, // Solo consulta si el modal está abierto
  });

  // 2. Mutación hacia rental-service
  const rentalMutation = useMutation({
    mutationFn: async (payload: RentalDTO) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al procesar el arriendo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      alert('Arriendo registrado correctamente');
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preselectedUser || !selectedCarId) return;

    rentalMutation.mutate({
      customerId: preselectedUser.id,
      carId: Number(selectedCarId),
      startDate,
      endDate,
    });
  };

  return (
    <div style={backdropStyle}>
      <div style={modalContainerStyle}>
        <h2 style={{ marginTop: 0 }}>Arriendo en Mesón</h2>
        
        {rentalMutation.isError && (
          <div style={errorStyle}>{rentalMutation.error.message}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={labelStyle}>Cliente (Solo lectura)</label>
            <div style={readOnlyFieldStyle}>
              {preselectedUser?.firstName} {preselectedUser?.lastName} - RUT: {preselectedUser?.rut}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Vehículo</label>
            <select
              style={inputStyle}
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(Number(e.target.value))}
              required
              disabled={isLoadingCars}
            >
              <option value="">{isLoadingCars ? 'Cargando autos...' : '-- Seleccione un auto --'}</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.brand} {car.model} ({car.plate}) - ${car.pricePerDay}/día
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha Inicio</label>
              <input
                type="date"
                style={inputStyle}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Fecha Devolución</label>
              <input
                type="date"
                style={inputStyle}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={rentalMutation.isPending}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={rentalMutation.isPending}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              {rentalMutation.isPending ? 'Procesando...' : 'Confirmar Arriendo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const backdropStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContainerStyle: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
const readOnlyFieldStyle: React.CSSProperties = { ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' };
const errorStyle: React.CSSProperties = { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', fontSize: '14px' };