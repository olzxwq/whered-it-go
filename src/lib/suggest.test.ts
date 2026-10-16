import { describe, expect, it } from 'vitest';
import { buildTitleIndex, canonicalTitle, matchTitles } from './suggest';

const index = buildTitleIndex(['Пятёрочка', 'пятерочка ', 'Пятёрочка', 'Проездной', null, '', 'Кофе', 'Кофе', 'Кофе', 'Кофе']);

describe('подсказки названий', () => {
  it('склеивает разные написания и выбирает самое частое', () => {
    expect(index.map((e) => [e.title, e.count])).toEqual([
      ['Кофе', 4],
      ['Пятёрочка', 3],
      ['Проездной', 1],
    ]);
  });

  it('ищет по части слова без учёта регистра и ё', () => {
    expect(matchTitles(index, 'пятер').map((e) => e.title)).toEqual(['Пятёрочка']);
    expect(matchTitles(index, 'П').map((e) => e.title)).toEqual(['Пятёрочка', 'Проездной']);
  });

  it('при сохранении приводит к привычному написанию', () => {
    expect(canonicalTitle(index, '  ПЯТЕРОЧКА ')).toBe('Пятёрочка');
    expect(canonicalTitle(index, 'Новое место')).toBe('Новое место');
    expect(canonicalTitle(index, '   ')).toBeNull();
  });
});
