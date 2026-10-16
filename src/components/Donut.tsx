// Кольцевая диаграмма на SVG. Касание или наведение на кусок показывает его сумму в центре.
import { formatRub } from '../lib/money';

export interface DonutSegment {
  id: string;
  label: string;
  valueKop: number;
  color: string;
}

const R = 80;
const WIDTH = 26;
const C = 2 * Math.PI * R;
const GAP = 3; // зазор между кусками цвета карточки

export function Donut(props: { segments: DonutSegment[]; totalKop: number; activeId: string | null; onActive: (id: string | null) => void }) {
  const { segments, totalKop, activeId, onActive } = props;
  const active = segments.find((s) => s.id === activeId);
  const gap = segments.length > 1 ? GAP : 0;

  let offset = 0;
  const arcs = segments.map((s) => {
    const len = (s.valueKop / totalKop) * C;
    const arc = { ...s, dash: Math.max(len - gap, 0.5), offset };
    offset += len;
    return arc;
  });

  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label="Кольцевая диаграмма">
        <g transform="rotate(-90 100 100)">
          {arcs.map((a) => (
            <circle
              key={a.id}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={a.id === activeId ? WIDTH + 8 : WIDTH}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.offset}
              opacity={activeId && a.id !== activeId ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity .15s, stroke-width .15s' }}
              onMouseEnter={() => onActive(a.id)}
              onMouseLeave={() => onActive(null)}
              onClick={() => onActive(a.id === activeId ? null : a.id)}
            >
              <title>{`${a.label}: ${formatRub(a.valueKop)}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="donut-center">
        <span className="donut-label">{active ? active.label : 'Итого'}</span>
        <span className="donut-value num">{formatRub(active ? active.valueKop : totalKop)}</span>
      </div>
    </div>
  );
}
