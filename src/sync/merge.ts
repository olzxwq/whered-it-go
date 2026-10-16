// Слияние данных двух устройств. Правило простое: для каждой записи (по id)
// побеждает версия с более поздним updatedAt. Удалённые записи — «надгробия» с deleted: true,
// поэтому удаление тоже доходит до других устройств, а не «воскресает».
import type { Card, Category, Expense, Setting, Source } from '../data/db';

export interface Snapshot {
  version: 1;
  categories: Category[];
  sources: Source[];
  cards: Card[];
  expenses: Expense[];
  settings: Setting[];
}

export const TABLES = ['categories', 'sources', 'cards', 'expenses', 'settings'] as const;
export type TableName = (typeof TABLES)[number];

export const emptySnapshot = (): Snapshot => ({ version: 1, categories: [], sources: [], cards: [], expenses: [], settings: [] });

type Rec = { updatedAt: number; deleted?: boolean };

const keyOf = (table: TableName, r: unknown) => (table === 'settings' ? (r as Setting).key : (r as { id: string }).id);

/** Кто новее. При равном времени удаление побеждает — так безопаснее. */
function newer<T extends Rec>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return b.deleted && !a.deleted ? b : a;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface MergeResult {
  merged: Snapshot;
  /** Записи, которые нужно записать на этом устройстве. */
  toLocal: Partial<Record<TableName, unknown[]>>;
  /** Нужно ли загрузить объединённый файл на Диск. */
  remoteChanged: boolean;
}

export function merge(local: Snapshot, remote: Snapshot): MergeResult {
  const merged = emptySnapshot();
  const toLocal: MergeResult['toLocal'] = {};
  let remoteChanged = false;

  for (const table of TABLES) {
    const localMap = new Map((local[table] as Rec[]).map((r) => [keyOf(table, r), r]));
    const remoteMap = new Map((remote[table] as Rec[]).map((r) => [keyOf(table, r), r]));
    const out: Rec[] = [];
    const localUpdates: Rec[] = [];

    for (const key of new Set([...localMap.keys(), ...remoteMap.keys()])) {
      const l = localMap.get(key);
      const r = remoteMap.get(key);
      const win = l && r ? newer(l, r) : (l ?? r)!;
      out.push(win);
      if (!l || !same(l, win)) localUpdates.push(win);
      if (!r || !same(r, win)) remoteChanged = true;
    }

    (merged[table] as Rec[]) = out;
    if (localUpdates.length) toLocal[table] = localUpdates;
  }
  return { merged, toLocal, remoteChanged };
}

/** Проверка, что файл с Диска похож на наш формат (а не что-то постороннее). */
export function isSnapshot(x: unknown): x is Snapshot {
  if (!x || typeof x !== 'object' || (x as Snapshot).version !== 1) return false;
  return TABLES.every((t) => Array.isArray((x as Snapshot)[t]));
}
