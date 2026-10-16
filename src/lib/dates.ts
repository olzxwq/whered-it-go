// Даты храним строками «2026-10-16» (без времени), месяцы — «2026-10».
// «Сегодня» определяется по часам устройства.

export type MonthKey = string;

const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function yesterdayISO(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export const monthKeyOf = (iso: string): MonthKey => iso.slice(0, 7);
export const currentMonthKey = (now = new Date()): MonthKey => monthKeyOf(todayISO(now));

function parseMonth(key: MonthKey): [number, number] {
  const [y, m] = key.split('-').map(Number);
  return [y, m];
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = parseMonth(key);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = parseMonth(key);
  return new Date(y, m, 0).getDate();
}

/** Первый и последний день месяца, включительно. */
export function monthRange(key: MonthKey): [string, string] {
  return [`${key}-01`, `${key}-${pad(daysInMonth(key))}`];
}

/** «Октябрь 2026» */
export function monthTitle(key: MonthKey): string {
  const [y, m] = parseMonth(key);
  const name = MONTHS_NOM[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}

/** «октября» — для «55 % от октября» */
export const monthGenitive = (key: MonthKey) => MONTHS_GEN[parseMonth(key)[1] - 1];
/** «октябре» — для «в октябре» */
export const monthPrepositional = (key: MonthKey) => MONTHS_PREP[parseMonth(key)[1] - 1];

/** «Сегодня», «Вчера», «14 октября», «3 марта 2025» */
export function dayLabel(iso: string, now = new Date()): string {
  if (iso === todayISO(now)) return 'Сегодня';
  if (iso === yesterdayISO(now)) return 'Вчера';
  const [y, m, d] = iso.split('-').map(Number);
  const base = `${d} ${MONTHS_GEN[m - 1]}`;
  return y === now.getFullYear() ? base : `${base} ${y}`;
}
