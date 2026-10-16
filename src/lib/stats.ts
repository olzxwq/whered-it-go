import type { Expense } from '../data/db';

export const sumKop = (items: Pick<Expense, 'amountKop'>[]) => items.reduce((s, e) => s + e.amountKop, 0);

export interface GroupTotal {
  id: string;
  totalKop: number;
  count: number;
}

/** Суммы по полю (источник, категория…), от большей к меньшей. */
export function totalsBy(items: Expense[], key: 'sourceId' | 'categoryId'): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const e of items) {
    const id = e[key];
    const g = map.get(id) ?? { id, totalKop: 0, count: 0 };
    g.totalKop += e.amountKop;
    g.count += 1;
    map.set(id, g);
  }
  return [...map.values()].sort((a, b) => b.totalKop - a.totalKop);
}

/** Траты текущего месяца на сегодня против всего прошлого месяца. */
export function compareMonths(currentKop: number, prevKop: number) {
  return {
    percent: prevKop > 0 ? Math.round((currentKop / prevKop) * 100) : null,
    ratio: prevKop > 0 ? currentKop / prevKop : null,
    overKop: currentKop - prevKop,
  };
}
