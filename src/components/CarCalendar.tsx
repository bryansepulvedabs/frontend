import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RentalResponse, RentalState } from '../types/rental';
import { STATUS_LABELS } from '../types/rental';
import { formatDate, toISO, todayISO } from '../utils/dates';
import './CarCalendar.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_CHIPS = 3;

interface Props {
  rentals: RentalResponse[];
}

// Un arriendo ocupa el auto desde el dia de retiro hasta la vispera de la devolucion:
// el dia de devolucion el auto queda libre (igual que en el calculo del precio y en la
// validacion de solapamiento del backend), asi que ahi se marca solo como "devuelve".
export default function CarCalendar({ rentals }: Props) {
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [showCancelled, setShowCancelled] = useState(false);

  const visible = useMemo(
    () => rentals.filter((r) => showCancelled || r.status !== 'CANCELADO'),
    [rentals, showCancelled],
  );

  // Celdas del mes: huecos al inicio para alinear con el lunes, y al final para completar la semana
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7; // semana que parte el lunes
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const list: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(toISO(new Date(cursor.year, cursor.month, d)));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const [y, m] = today.split('-').map(Number);
    setCursor({ year: y, month: m - 1 });
  };

  const label = (r: RentalResponse) =>
    `Arriendo #${r.id} · ${r.user.firstName} ${r.user.lastName} · ${formatDate(r.startDate)} → ${formatDate(r.endDate)} · ${STATUS_LABELS[r.status]}`;

  const legend: RentalState[] = showCancelled
    ? ['PENDIENTE', 'ACTIVO', 'FINALIZADO', 'CANCELADO']
    : ['PENDIENTE', 'ACTIVO', 'FINALIZADO'];

  return (
    <div className="cal">
      <div className="cal__toolbar">
        <div className="cal__nav">
          <button type="button" className="cal__btn" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}>‹</button>
          <h3 className="cal__title">{title}</h3>
          <button type="button" className="cal__btn" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}>›</button>
          <button type="button" className="cal__today" onClick={goToday}>Hoy</button>
        </div>
        <label className="cal__toggle">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Mostrar cancelados
        </label>
      </div>

      <div className="cal__grid" role="grid" aria-label={`Calendario de ${title}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal__weekday" role="columnheader">{w}</div>
        ))}

        {cells.map((iso, i) => {
          if (!iso) return <div key={`blank-${i}`} className="cal__cell cal__cell--blank" />;

          const occupying = visible.filter((r) => r.startDate <= iso && iso < r.endDate);
          const returning = visible.filter((r) => r.endDate === iso);
          const day = Number(iso.slice(8));
          const extra = occupying.length - MAX_CHIPS;

          return (
            <div
              key={iso}
              role="gridcell"
              className={`cal__cell${iso === today ? ' cal__cell--today' : ''}${iso < today ? ' cal__cell--past' : ''}`}
            >
              <span className="cal__day">{day}</span>

              {occupying.slice(0, MAX_CHIPS).map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/arriendos/${r.id}`}
                  className={`cal__chip cal__chip--${r.status.toLowerCase()}`}
                  title={label(r)}
                >
                  #{r.id}
                </Link>
              ))}
              {extra > 0 && <span className="cal__more">+{extra} más</span>}

              {returning.map((r) => (
                <Link
                  key={`ret-${r.id}`}
                  to={`/admin/arriendos/${r.id}`}
                  className="cal__return"
                  title={`${label(r)} · devolución`}
                >
                  ↩ #{r.id}
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <ul className="cal__legend">
        {legend.map((s) => (
          <li key={s}>
            <span className={`cal__swatch cal__chip--${s.toLowerCase()}`} />
            {STATUS_LABELS[s]}
          </li>
        ))}
        <li><span className="cal__swatch cal__swatch--return">↩</span>Día de devolución (el auto queda libre)</li>
      </ul>
    </div>
  );
}