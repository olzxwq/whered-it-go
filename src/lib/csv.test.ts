import { describe, expect, it } from 'vitest';
import type { Expense } from '../data/db';
import { expensesToCsv } from './csv';

const base = { sourceId: 'src', cardId: null, createdAt: 0, updatedAt: 0, deleted: false };
const names: Record<string, string> = { cat: 'Кафе и доставка', src: 'Стипендия', card: 'Т-Банк · Зарплатная' };

describe('CSV', () => {
  it('пишет BOM, «;», даты и суммы по-русски, экранирует опасное', () => {
    const items: Expense[] = [
      { ...base, id: '2', amountKop: 125050, categoryId: 'cat', title: 'Кофе; "с собой"', spentOn: '2026-10-16', cardId: 'card' },
      { ...base, id: '1', amountKop: 5, categoryId: 'cat', title: '=СУММ(A1)', spentOn: '2026-10-01' },
    ];
    const csv = expensesToCsv(items, (id) => (id ? names[id] : ''));
    expect(csv.startsWith('﻿Дата;Сумма, ₽;Категория;Источник;Карта;Название\r\n')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[1]).toBe("01.10.2026;0,05;Кафе и доставка;Стипендия;;'=СУММ(A1)");
    expect(lines[2]).toBe('16.10.2026;1250,50;Кафе и доставка;Стипендия;Т-Банк · Зарплатная;"Кофе; ""с собой"""');
  });
});
