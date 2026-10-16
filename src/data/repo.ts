// ВСЕ операции с данными собраны здесь. Остальной код не знает, где лежат данные.
// В будущей общей версии этот файл заменим обращениями к серверу.
import { db, type Card, type Category, type Expense, type Source } from './db';
import { DEFAULT_CATEGORIES, SUGGESTED_SOURCES } from './defaults';
import { isValidISODate, monthRange, type MonthKey } from '../lib/dates';
import { titleKey } from '../lib/suggest';

/** Случайный UUID. crypto.randomUUID есть не везде (например, при открытии по Wi-Fi через http), поэтому делаем сами. */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const alive = <T extends { deleted: boolean }>(items: T[]) => items.filter((x) => !x.deleted);
const byCreated = <T extends { createdAt: number }>(a: T, b: T) => a.createdAt - b.createdAt;

// ---------- Настройки ----------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value, updatedAt: Date.now() });
}

export const isOnboarded = async () => (await getSetting<boolean>('onboarded')) === true;

// ---------- Первый запуск ----------

/** Создаёт стандартные категории (только те, которых ещё нет). */
async function ensureDefaultCategories(): Promise<void> {
  const existing = new Set((await db.categories.toArray()).map((c) => c.id));
  const base = Date.now();
  const missing = DEFAULT_CATEGORIES.filter((c) => !existing.has(c.id)).map((c, i) => ({
    ...c,
    createdAt: base + i, // +i сохраняет порядок из списка
    updatedAt: base + i,
    deleted: false,
  }));
  await db.categories.bulkAdd(missing);
}

/** Первый вход: создаёт выбранные источники и стандартные категории. */
export async function completeOnboarding(sourceNames: string[]): Promise<void> {
  const names = uniqueNames(sourceNames);
  if (names.length === 0) throw new Error('Нужен хотя бы один источник');
  await db.transaction('rw', [db.categories, db.sources, db.settings], async () => {
    await ensureDefaultCategories();
    const base = Date.now();
    const sources: Source[] = names.map((name, i) => ({
      id: SUGGESTED_SOURCES.find((s) => titleKey(s.name) === titleKey(name))?.id ?? uuid(),
      name,
      createdAt: base + i,
      updatedAt: base + i,
      deleted: false,
    }));
    await db.sources.bulkPut(sources);
    await setSetting('lastSourceId', sources[0].id);
    await setSetting('onboarded', true);
  });
}

/** Убирает пустые строки и повторы без учёта регистра. */
function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (name && !seen.has(titleKey(name))) {
      seen.add(titleKey(name));
      result.push(name);
    }
  }
  return result;
}

// ---------- Справочники ----------

export const listCategories = async (): Promise<Category[]> => alive(await db.categories.toArray()).sort(byCreated);
export const listSources = async (): Promise<Source[]> => alive(await db.sources.toArray()).sort(byCreated);
export const listCards = async (): Promise<Card[]> => alive(await db.cards.toArray()).sort(byCreated);

// ---------- Расходы ----------

export interface ExpenseInput {
  amountKop: number;
  categoryId: string;
  sourceId: string;
  cardId: string | null;
  title: string | null;
  spentOn: string;
}

/** Проверяем данные и здесь, а не только в форме: так ошибку в интерфейсе не пропустит хранилище. */
async function validate(input: ExpenseInput): Promise<void> {
  if (!Number.isSafeInteger(input.amountKop) || input.amountKop <= 0) throw new Error('Сумма должна быть больше нуля');
  if (!isValidISODate(input.spentOn)) throw new Error('Некорректная дата');
  const [cat, src] = await Promise.all([db.categories.get(input.categoryId), db.sources.get(input.sourceId)]);
  if (!cat || cat.deleted) throw new Error('Категория не найдена');
  if (!src || src.deleted) throw new Error('Источник не найден');
  if (input.cardId) {
    const card = await db.cards.get(input.cardId);
    if (!card || card.deleted) throw new Error('Карта не найдена');
  }
}

export async function addExpense(input: ExpenseInput): Promise<Expense> {
  await validate(input);
  const now = Date.now();
  const expense: Expense = { ...input, id: uuid(), createdAt: now, updatedAt: now, deleted: false };
  await db.transaction('rw', [db.expenses, db.settings], async () => {
    await db.expenses.add(expense);
    await setSetting('lastSourceId', input.sourceId);
  });
  return expense;
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  await validate(input);
  const n = await db.expenses.update(id, { ...input, updatedAt: Date.now() });
  if (n === 0) throw new Error('Расход не найден');
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deleted: true, updatedAt: Date.now() });
}

/** Расходы за месяц, свежие сверху. */
export async function expensesInMonth(month: MonthKey): Promise<Expense[]> {
  const [from, to] = monthRange(month);
  const items = await db.expenses.where('spentOn').between(from, to, true, true).toArray();
  return alive(items).sort(newestFirst);
}

export async function recentExpenses(limit: number): Promise<Expense[]> {
  // Берём с запасом последние по дате и досортировываем по времени создания
  const items = await db.expenses.orderBy('spentOn').reverse().limit(limit * 3 + 20).toArray();
  return alive(items).sort(newestFirst).slice(0, limit);
}

export async function allTitles(): Promise<(string | null)[]> {
  return alive(await db.expenses.toArray()).map((e) => e.title);
}

function newestFirst(a: Expense, b: Expense): number {
  return b.spentOn.localeCompare(a.spentOn) || b.createdAt - a.createdAt;
}
