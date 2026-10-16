import 'fake-indexeddb/auto'; // подменяет IndexedDB в тестах, где нет браузера
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import * as repo from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const base = { cardId: null, title: null };

describe('первый запуск', () => {
  it('создаёт стандартные категории и выбранные источники без повторов', async () => {
    await repo.completeOnboarding(['Стипендия', ' стипендия ', 'Подработка', '']);
    expect((await repo.listCategories()).map((c) => c.name)).toHaveLength(11);
    const sources = await repo.listSources();
    expect(sources.map((s) => s.name)).toEqual(['Стипендия', 'Подработка']);
    expect(sources[0].id).toBe('src-stipend');
    expect(await repo.isOnboarded()).toBe(true);
    expect(await repo.getSetting('lastSourceId')).toBe('src-stipend');
  });

  it('не пускает без источников', async () => {
    await expect(repo.completeOnboarding(['  '])).rejects.toThrow();
    expect(await repo.isOnboarded()).toBe(false);
  });
});

describe('расходы', () => {
  beforeEach(async () => {
    await repo.completeOnboarding(['Стипендия', 'Родители']);
  });

  it('добавляет, выбирает за месяц, исправляет и удаляет', async () => {
    const a = await repo.addExpense({ ...base, amountKop: 15000, categoryId: 'cat-cafe', sourceId: 'src-stipend', spentOn: '2026-10-16' });
    await repo.addExpense({ ...base, amountKop: 5000, categoryId: 'cat-products', sourceId: 'src-parents', spentOn: '2026-09-30' });

    expect((await repo.expensesInMonth('2026-10')).map((e) => e.amountKop)).toEqual([15000]);
    expect(await repo.getSetting('lastSourceId')).toBe('src-parents');

    await repo.updateExpense(a.id, { ...base, amountKop: 20000, categoryId: 'cat-cafe', sourceId: 'src-stipend', spentOn: '2026-10-01' });
    expect((await repo.expensesInMonth('2026-10'))[0].amountKop).toBe(20000);

    await repo.deleteExpense(a.id);
    expect(await repo.expensesInMonth('2026-10')).toEqual([]);
    // запись осталась как «надгробие» для синхронизации
    expect((await db.expenses.get(a.id))?.deleted).toBe(true);
  });

  it('отклоняет нулевую сумму, чужую категорию и кривую дату', async () => {
    const ok = { ...base, amountKop: 100, categoryId: 'cat-cafe', sourceId: 'src-stipend', spentOn: '2026-10-16' };
    await expect(repo.addExpense({ ...ok, amountKop: 0 })).rejects.toThrow();
    await expect(repo.addExpense({ ...ok, categoryId: 'nope' })).rejects.toThrow();
    await expect(repo.addExpense({ ...ok, spentOn: '2026-02-30' })).rejects.toThrow();
  });
});
