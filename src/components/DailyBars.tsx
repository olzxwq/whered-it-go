// Столбчатый график трат по дням месяца. Касание столбика показывает сумму за день.
import { useState } from 'react';
import { dayLabel, todayISO, type MonthKey } from '../lib/dates';
import { formatRub } from '../lib/money';

export function DailyBars({ month, values }: { month: MonthKey; values: number[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const today = todayISO();
  const iso = (i: number) => `${month}-${String(i + 1).padStart(2, '0')}`;

  return (
    <div>
      <p className="bars-info">
        {active !== null ? (
          <>
            <span>{dayLabel(iso(active))}</span>
            <strong className="num">{formatRub(values[active])}</strong>
          </>
        ) : (
          <span className="muted">Больше всего за день: {formatRub(Math.max(...values))}</span>
        )}
      </p>
      <div className="bars" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }} onMouseLeave={() => setActive(null)}>
        {values.map((v, i) => (
          <button
            key={i}
            className={`bar-hit ${active === i ? 'on' : ''}`}
            aria-label={`${dayLabel(iso(i))}: ${formatRub(v)}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(active === i ? null : i)}
          >
            <span className={`bar ${iso(i) === today ? 'today' : ''}`} style={{ height: v ? `max(${(v / max) * 100}%, 3px)` : 0 }} />
          </button>
        ))}
      </div>
      <div className="bars-axis" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((_, i) => (
          <span key={i}>{i === 0 || (i + 1) % 5 === 0 ? i + 1 : ''}</span>
        ))}
      </div>
    </div>
  );
}
