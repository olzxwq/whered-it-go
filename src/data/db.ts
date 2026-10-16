// Описание хранилищ IndexedDB (встроенной базы данных браузера).
// Каждая запись хранит updatedAt и deleted — это понадобится для синхронизации между устройствами.
import Dexie, { type EntityTable } from 'dexie';

export interface BaseRecord {
  id: string;
  createdAt: number; // миллисекунды с 1970 года
  updatedAt: number;
  deleted: boolean; // «надгробие»: удалённые записи помечаются, а не стираются
}

export interface Category extends BaseRecord {
  name: string;
}

export interface Source extends BaseRecord {
  name: string;
}

export interface Card extends BaseRecord {
  bank: string;
  name: string | null;
}

export interface Expense extends BaseRecord {
  amountKop: number;
  categoryId: string;
  sourceId: string;
  cardId: string | null;
  title: string | null;
  spentOn: string; // «2026-10-16»
}

/** Общие настройки, которые синхронизируются между устройствами. */
export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

class AppDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  sources!: EntityTable<Source, 'id'>;
  cards!: EntityTable<Card, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('whered-it-go');
    // Здесь перечислены только поля, по которым нужен быстрый поиск (индексы)
    this.version(1).stores({
      categories: 'id',
      sources: 'id',
      cards: 'id',
      expenses: 'id, spentOn',
      settings: 'key',
    });
  }
}

export const db = new AppDB();
