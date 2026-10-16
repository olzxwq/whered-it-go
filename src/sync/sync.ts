// Синхронизация: скачать data.json с Диска → слить с данными устройства → сохранить у себя → загрузить обратно.
// Запускается при открытии сайта, при возвращении во вкладку, при появлении интернета
// и через 3 секунды после любого изменения.
import { useSyncExternalStore } from 'react';
import { db } from '../data/db';
import { emptySnapshot, isSnapshot, merge, TABLES, type Snapshot } from './merge';
import { AuthError, clearToken, downloadData, getToken, saveToken, uploadData } from './yandexDisk';

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  lastSyncAt: number | null;
  error: string | null;
}

const LAST_KEY = 'yadisk-last-sync';

function readLast(): number | null {
  try {
    return Number(localStorage.getItem(LAST_KEY)) || null;
  } catch {
    return null;
  }
}

let status: SyncStatus = { connected: getToken() !== null, syncing: false, lastSyncAt: readLast(), error: null };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

async function readLocal(): Promise<Snapshot> {
  const [categories, sources, cards, expenses, settings] = await Promise.all(TABLES.map((t) => db.table(t).toArray()));
  return { version: 1, categories, sources, cards, expenses, settings };
}

let applying = false; // пока записываем данные с Диска, не запускаем новую синхронизацию
let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true; // изменения пришли во время синхронизации — повторим сразу после
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const token = getToken();
      if (!token) {
        setStatus({ connected: false, syncing: false });
        return;
      }
      setStatus({ connected: true, syncing: true, error: null });
      try {
        const raw = await downloadData(token);
        if (raw !== null && !isSnapshot(raw)) throw new Error('Файл на Диске повреждён — ничего не меняю');
        const { merged, toLocal, remoteChanged } = merge(await readLocal(), raw ?? emptySnapshot());

        if (Object.keys(toLocal).length > 0) {
          applying = true;
          try {
            await db.transaction('rw', db.tables, async () => {
              for (const [table, rows] of Object.entries(toLocal)) await db.table(table).bulkPut(rows);
            });
          } finally {
            applying = false;
          }
        }
        if (remoteChanged || raw === null) await uploadData(token, merged);

        const now = Date.now();
        localStorage.setItem(LAST_KEY, String(now));
        setStatus({ syncing: false, lastSyncAt: now });
      } catch (e) {
        console.error('Синхронизация не удалась:', e);
        if (e instanceof AuthError) {
          clearToken();
          setStatus({ connected: false, syncing: false, error: e.message });
          return;
        }
        const offline = e instanceof TypeError; // fetch не достучался до сервера
        setStatus({ syncing: false, error: offline ? 'Нет связи с Диском — синхронизирую позже' : (e as Error).message });
        again = false;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleSync() {
  if (applying || !getToken()) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, 3000);
}

/** Подключаем «слушателей» изменений и запускаем первую синхронизацию. */
export function initSync(): void {
  for (const table of db.tables) {
    table.hook('creating', () => void scheduleSync());
    table.hook('updating', () => void scheduleSync());
  }
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  void syncNow();
}

/** Запасной вход: проверяем вставленный вручную код и сохраняем его. */
export async function connectWithToken(raw: string): Promise<void> {
  const token = raw.trim();
  if (!token) throw new Error('Вставьте код со страницы Яндекса');
  await downloadData(token); // бросит ошибку, если код не подходит
  saveToken(token);
  await syncNow();
}

/** Отключить Диск на этом устройстве. Данные на устройстве и на Диске остаются. */
export function disconnect(): void {
  clearToken();
  localStorage.removeItem(LAST_KEY);
  setStatus({ connected: false, lastSyncAt: null, error: null });
}
