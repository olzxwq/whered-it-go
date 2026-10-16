// Подсказки названий: чтобы «Пятёрочка», «пятерочка » и «ПЯТЁРОЧКА» были одной тратой.

/** Ключ для сравнения: без лишних пробелов, без регистра, «ё» = «е». */
export function titleKey(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е');
}

/** Убирает лишние пробелы, пустую строку превращает в null. */
export function cleanTitle(s: string): string | null {
  const t = s.trim().replace(/\s+/g, ' ');
  return t || null;
}

export interface TitleEntry {
  title: string; // самое частое написание
  key: string;
  count: number;
}

export function buildTitleIndex(titles: (string | null)[]): TitleEntry[] {
  const groups = new Map<string, Map<string, number>>();
  for (const raw of titles) {
    const t = raw && cleanTitle(raw);
    if (!t) continue;
    const key = titleKey(t);
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(t, (spellings.get(t) ?? 0) + 1);
    groups.set(key, spellings);
  }
  const result: TitleEntry[] = [];
  for (const [key, spellings] of groups) {
    let best = '';
    let bestCount = 0;
    let count = 0;
    for (const [t, c] of spellings) {
      count += c;
      if (c > bestCount) [best, bestCount] = [t, c];
    }
    result.push({ title: best, key, count });
  }
  return result.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ru'));
}

/** До `limit` подсказок, содержащих введённый текст (самые частые — первыми). */
export function matchTitles(index: TitleEntry[], query: string, limit = 5): TitleEntry[] {
  const q = titleKey(query);
  const list = q ? index.filter((e) => e.key.includes(q) && e.key !== q) : index;
  return list.slice(0, limit);
}

/** Если такое название уже встречалось, возвращает его привычное написание. */
export function canonicalTitle(index: TitleEntry[], input: string): string | null {
  const t = cleanTitle(input);
  if (!t) return null;
  return index.find((e) => e.key === titleKey(t))?.title ?? t;
}
