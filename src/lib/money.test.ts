import { describe, expect, it } from 'vitest';
import { formatRub, kopToInput, parseAmount } from './money';

describe('parseAmount', () => {
  it('понимает рубли и копейки через запятую или точку', () => {
    expect(parseAmount('1250,50')).toBe(125050);
    expect(parseAmount('1250.5')).toBe(125050);
    expect(parseAmount('1 250')).toBe(125000);
    expect(parseAmount('0,01')).toBe(1);
  });

  it('отклоняет ноль, отрицательные, мусор и больше двух знаков после запятой', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('1,005')).toBeNull();
    expect(parseAmount('1e5')).toBeNull();
  });
});

describe('formatRub', () => {
  it('форматирует по-русски', () => {
    expect(formatRub(125050)).toBe('1 250,50 ₽');
    expect(formatRub(125000)).toBe('1 250 ₽');
    expect(formatRub(5)).toBe('0,05 ₽');
    expect(formatRub(123456789)).toBe('1 234 567,89 ₽');
  });
});

describe('kopToInput', () => {
  it('готовит сумму для поля ввода', () => {
    expect(kopToInput(125050)).toBe('1250,50');
    expect(kopToInput(125000)).toBe('1250');
    expect(kopToInput(7)).toBe('0,07');
  });
});
