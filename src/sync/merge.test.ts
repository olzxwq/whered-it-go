import { describe, expect, it } from 'vitest';
import type { Expense } from '../data/db';
import { emptySnapshot, isSnapshot, merge, type Snapshot } from './merge';

const exp = (id: string, amountKop: number, updatedAt: number, deleted = false): Expense => ({
  id,
  amountKop,
  categoryId: 'cat-cafe',
  sourceId: 'src-stipend',
  cardId: null,
  title: null,
  spentOn: '2026-10-16',
  createdAt: 1,
  updatedAt,
  deleted,
});

const snap = (expenses: Expense[], extra: Partial<Snapshot> = {}): Snapshot => ({ ...emptySnapshot(), expenses, ...extra });

describe('слияние устройств', () => {
  it('объединяет новые записи с обеих сторон', () => {
    const { merged, toLocal, remoteChanged } = merge(snap([exp('a', 100, 1)]), snap([exp('b', 200, 1)]));
    expect(merged.expenses.map((e) => e.id).sort()).toEqual(['a', 'b']);
    expect(toLocal.expenses?.map((e) => (e as Expense).id)).toEqual(['b']);
    expect(remoteChanged).toBe(true);
  });

  it('берёт более свежую версию записи', () => {
    const { merged, toLocal } = merge(snap([exp('a', 100, 5)]), snap([exp('a', 999, 9)]));
    expect(merged.expenses[0].amountKop).toBe(999);
    expect(toLocal.expenses).toHaveLength(1);
  });

  it('удаление на одном устройстве доходит до другого', () => {
    const { merged, remoteChanged } = merge(snap([exp('a', 100, 10, true)]), snap([exp('a', 100, 5)]));
    expect(merged.expenses[0].deleted).toBe(true);
    expect(remoteChanged).toBe(true);
  });

  it('при одинаковом времени побеждает удаление', () => {
    const { merged } = merge(snap([exp('a', 100, 5)]), snap([exp('a', 100, 5, true)]));
    expect(merged.expenses[0].deleted).toBe(true);
  });

  it('ничего не меняет, если данные одинаковые', () => {
    const s = snap([exp('a', 100, 5)], { settings: [{ key: 'onboarded', value: true, updatedAt: 1 }] });
    const { toLocal, remoteChanged } = merge(s, structuredClone(s));
    expect(toLocal).toEqual({});
    expect(remoteChanged).toBe(false);
  });

  it('настройки сливаются по ключу', () => {
    const { merged } = merge(
      snap([], { settings: [{ key: 'lastSourceId', value: 'x', updatedAt: 1 }] }),
      snap([], { settings: [{ key: 'lastSourceId', value: 'y', updatedAt: 2 }, { key: 'onboarded', value: true, updatedAt: 2 }] }),
    );
    expect(Object.fromEntries(merged.settings.map((s) => [s.key, s.value]))).toEqual({ lastSourceId: 'y', onboarded: true });
  });

  it('распознаёт свой формат файла', () => {
    expect(isSnapshot(emptySnapshot())).toBe(true);
    expect(isSnapshot({ version: 2 })).toBe(false);
    expect(isSnapshot('hello')).toBe(false);
  });
});
