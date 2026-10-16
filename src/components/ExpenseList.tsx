// Список расходов, сгруппированный по дням. Нажатие на строку открывает исправление.
import type { Expense } from '../data/db';
import { useNames } from '../data/hooks';
import { useExpenseSheet } from '../app/ExpenseSheet';
import { dayLabel } from '../lib/dates';
import { formatRub } from '../lib/money';
import { sumKop } from '../lib/stats';

export function ExpenseList({ items, groupByDay = true }: { items: Expense[]; groupByDay?: boolean }) {
  const name = useNames();
  const { openEdit } = useExpenseSheet();

  const groups: { day: string; items: Expense[] }[] = [];
  for (const e of items) {
    const last = groups[groups.length - 1];
    if (groupByDay && last?.day === e.spentOn) last.items.push(e);
    else groups.push({ day: e.spentOn, items: [e] });
  }

  return (
    <div className="expense-list">
      {groups.map((g, i) => (
        <div key={`${g.day}-${i}`}>
          {groupByDay && (
            <div className="day-head">
              <span>{dayLabel(g.day)}</span>
              <span className="num">{formatRub(sumKop(g.items))}</span>
            </div>
          )}
          {g.items.map((e) => {
            const category = name(e.categoryId);
            const meta = [e.title ? category : null, name(e.sourceId), e.cardId ? name(e.cardId) : null, groupByDay ? null : dayLabel(e.spentOn)]
              .filter(Boolean)
              .join(' · ');
            return (
              <button key={e.id} className="expense" onClick={() => openEdit(e)}>
                <span className="expense-icon">{category.slice(0, 1)}</span>
                <span className="expense-body">
                  <span className="expense-title" style={{ display: 'block' }}>
                    {e.title ?? category}
                  </span>
                  <span className="expense-meta" style={{ display: 'block' }}>
                    {meta}
                  </span>
                </span>
                <span className="expense-amount num">{formatRub(e.amountKop)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
