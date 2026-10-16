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

// ---------- Статистика за месяц ----------

export interface BreakdownRow {
  id: string;
  label: string;
  totalKop: number;
  count: number;
  share: number; // доля от итога, 0…1
}

/** Разбивка по произвольному ключу, от большего к меньшему. */
export function breakdown(items: Expense[], key: (e: Expense) => string, label: (id: string) => string): BreakdownRow[] {
  const total = sumKop(items);
  const map = new Map<string, { totalKop: number; count: number }>();
  for (const e of items) {
    const id = key(e);
    const g = map.get(id) ?? { totalKop: 0, count: 0 };
    g.totalKop += e.amountKop;
    g.count += 1;
    map.set(id, g);
  }
  return [...map.entries()]
    .map(([id, g]) => ({ id, label: label(id), ...g, share: total ? g.totalKop / total : 0 }))
    .sort((a, b) => b.totalKop - a.totalKop || a.label.localeCompare(b.label, 'ru'));
}

export const NO_TITLE = '__no_title__';

const MAX_SLOTS = 8;

/**
 * Закрепляет цвет за группой (а не за местом в рейтинге), чтобы при фильтре по карте
 * цвета не перескакивали. Цветов 8: если групп больше, первые 7 получают свои,
 * остальные уходят в «Остальное» (серый).
 */
export function assignSlots(rows: BreakdownRow[]): Map<string, number> {
  const take = rows.length <= MAX_SLOTS ? rows.length : MAX_SLOTS - 1;
  return new Map(rows.slice(0, take).map((r, i) => [r.id, i + 1]));
}

/** Траты по дням месяца: индекс 0 — 1-е число. */
export function dailyTotals(items: Expense[], days: number): number[] {
  const result = new Array<number>(days).fill(0);
  for (const e of items) {
    const day = Number(e.spentOn.slice(8, 10));
    if (day >= 1 && day <= days) result[day - 1] += e.amountKop;
  }
  return result;
}

/** «12,5 %» */
export function formatPercent(share: number): string {
  const p = Math.round(share * 1000) / 10;
  return `${String(p).replace('.', ',')} %`;
}
