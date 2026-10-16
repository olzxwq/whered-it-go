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

  it('отклоняет нулевую сумму, несуществующую категорию и кривую дату', async () => {
    const ok = { ...base, amountKop: 100, categoryId: 'cat-cafe', sourceId: 'src-stipend', spentOn: '2026-10-16' };
    await expect(repo.addExpense({ ...ok, amountKop: 0 })).rejects.toThrow();
    await expect(repo.addExpense({ ...ok, categoryId: 'nope' })).rejects.toThrow();
    await expect(repo.addExpense({ ...ok, spentOn: '2026-02-30' })).rejects.toThrow();
  });
});

describe('категории и источники', () => {
  beforeEach(async () => {
    await repo.completeOnboarding(['Стипендия', 'Родители']);
  });

  it('добавляет и переименовывает, не допуская одинаковых названий', async () => {
    await repo.addNamed('categories', '  Хобби ');
    await expect(repo.addNamed('categories', 'хобби')).rejects.toThrow('Такая категория уже есть');
    await expect(repo.addNamed('categories', 'УЧЕБА')).rejects.toThrow(); // ё = е
    await expect(repo.renameNamed('sources', 'src-parents', 'стипендия')).rejects.toThrow('Такой источник уже есть');

    await repo.renameNamed('categories', 'cat-cafe', 'Кафе');
    const names = (await repo.listCategories()).map((c) => c.name);
    expect(names).toContain('Хобби');
    expect(names).toContain('Кафе');
    // переименование в то же имя другим регистром — можно
    await repo.renameNamed('categories', 'cat-cafe', 'КАФЕ');
  });

  it('не удаляет последний источник', async () => {
    await repo.deleteNamed('sources', 'src-parents');
    await expect(repo.deleteNamed('sources', 'src-stipend')).rejects.toThrow('Нельзя удалить последний источник');
  });

  it('при удалении требует выбрать, куда перенести расходы, и переносит их', async () => {
    const e = await repo.addExpense({ ...base, amountKop: 100, categoryId: 'cat-cafe', sourceId: 'src-parents', spentOn: '2026-10-16' });
    await expect(repo.deleteNamed('sources', 'src-parents')).rejects.toThrow('Выберите, куда перенести');
    await repo.deleteNamed('sources', 'src-parents', 'src-stipend');
    expect((await db.expenses.get(e.id))?.sourceId).toBe('src-stipend');
    expect((await repo.listSources()).map((s) => s.id)).toEqual(['src-stipend']);
    expect(await repo.getSetting('lastSourceId')).toBe('src-stipend');
  });
});

describe('карты', () => {
  beforeEach(async () => {
    await repo.completeOnboarding(['Стипендия']);
  });

  it('добавляет без номера, переименовывает и при удалении отвязывает расходы', async () => {
    await expect(repo.addCard({ bank: '  ', name: 'Кредитка' })).rejects.toThrow();
    await repo.addCard({ bank: 'Т-Банк', name: '' });
    const [card] = await repo.listCards();
    expect(card.name).toBeNull();

    await repo.updateCard(card.id, { bank: 'Т-Банк', name: 'Зарплатная' });
    expect((await repo.listCards())[0].name).toBe('Зарплатная');

    const e = await repo.addExpense({ ...base, cardId: card.id, amountKop: 100, categoryId: 'cat-cafe', sourceId: 'src-stipend', spentOn: '2026-10-16' });
    expect((await repo.expenseCounts()).get(card.id)).toBe(1);
    await repo.deleteCard(card.id);
    expect((await db.expenses.get(e.id))?.cardId).toBeNull();
    expect(await repo.listCards()).toEqual([]);
  });
});
