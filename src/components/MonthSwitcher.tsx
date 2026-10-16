import { currentMonthKey, monthTitle, shiftMonth, type MonthKey } from '../lib/dates';
import { Icon } from './Icon';

/** ← Октябрь 2026 → (вперёд дальше текущего месяца нельзя) */
export function MonthSwitcher({ month, onChange }: { month: MonthKey; onChange: (m: MonthKey) => void }) {
  const isCurrent = month >= currentMonthKey();
  return (
    <div className="month-switch">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Предыдущий месяц">
        <Icon name="left" />
      </button>
      <span className="month-name">{monthTitle(month)}</span>
      <button className="icon-btn" disabled={isCurrent} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Следующий месяц">
        <Icon name="right" />
      </button>
    </div>
  );
}
