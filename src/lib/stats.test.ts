import { describe, expect, it } from 'vitest';
import type { Expense } from '../data/db';
import { breakdown, compareMonths, dailyTotals, formatPercent } from './stats';

const e = (amountKop: number, categoryId: string, spentOn = '2026-10-05'): Expense => ({
  id: Math.random().toString(),
  amountKop,
  categoryId,
  sourceId: 's',
  cardId: null,
  title: null,
  spentOn,
  createdAt: 0,
  updatedAt: 0,
  deleted: false,
});

describe('статистика', () => {
  it('разбивает по категориям от большего к меньшему с долями и количеством', () => {
    const rows = breakdown([e(100, 'a'), e(300, 'b'), e(100, 'a')], (x) => x.categoryId, (id) => id.toUpperCase());
    expect(rows).toEqual([
      { id: 'b', label: 'B', totalKop: 300, count: 1, share: 0.6 },
      { id: 'a', label: 'A', totalKop: 200, count: 2, share: 0.4 },
    ]);
  });

  it('считает траты по дням', () => {
    expect(dailyTotals([e(100, 'a', '2026-10-01'), e(50, 'a', '2026-10-01'), e(7, 'a', '2026-10-03')], 3)).toEqual([150, 0, 7]);
  });

  it('сравнивает с прошлым месяцем', () => {
    expect(compareMonths(4250, 8000)).toMatchObject({ percent: 53, overKop: -3750 });
    expect(compareMonths(100, 0).percent).toBeNull();
  });

  it('форматирует проценты по-русски', () => {
    expect(formatPercent(0.125)).toBe('12,5 %');
    expect(formatPercent(1 / 3)).toBe('33,3 %');
  });
});
