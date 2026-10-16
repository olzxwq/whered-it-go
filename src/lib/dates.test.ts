import { describe, expect, it } from 'vitest';
import { dayLabel, daysInMonth, isValidISODate, monthGenitive, monthRange, monthTitle, shiftMonth } from './dates';

describe('месяцы', () => {
  it('сдвигает месяц через границу года', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('знает длину месяца, включая високосный февраль', () => {
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(monthRange('2026-10')).toEqual(['2026-10-01', '2026-10-31']);
  });

  it('пишет названия по-русски', () => {
    expect(monthTitle('2026-10')).toBe('Октябрь 2026');
    expect(monthGenitive('2026-09')).toBe('сентября');
  });
});

describe('dayLabel', () => {
  const now = new Date(2026, 9, 16, 12);
  it('сегодня, вчера и обычные даты', () => {
    expect(dayLabel('2026-10-16', now)).toBe('Сегодня');
    expect(dayLabel('2026-10-15', now)).toBe('Вчера');
    expect(dayLabel('2026-10-01', now)).toBe('1 октября');
    expect(dayLabel('2025-03-03', now)).toBe('3 марта 2025');
  });
});

describe('isValidISODate', () => {
  it('отличает настоящие даты от выдуманных', () => {
    expect(isValidISODate('2026-10-16')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('16.10.2026')).toBe(false);
  });
});
