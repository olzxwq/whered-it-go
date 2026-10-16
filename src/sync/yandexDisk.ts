// Вход через Яндекс (OAuth) и работа с файлом data.json в папке приложения на Диске.
// Сайт получает доступ ТОЛЬКО к своей папке «Приложения/Where'd It Go», остальные файлы ему не видны.

/** ClientID приложения с oauth.yandex.ru. Он не секретный: его видит любой, кто открывает страницу входа. */
export const YANDEX_CLIENT_ID = '';

const API = 'https://cloud-api.yandex.net/v1/disk/resources';
const FILE = 'app:/data.json';
const TOKEN_KEY = 'yadisk-token';
const STATE_KEY = 'yadisk-state';

export class AuthError extends Error {}

// ---------- Токен (хранится только на этом устройстве) ----------

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number };
    return expiresAt > Date.now() ? token : null;
  } catch {
    return null;
  }
}

export function saveToken(token: string, expiresInSec = 365 * 24 * 3600): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt: Date.now() + expiresInSec * 1000 }));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- Вход ----------

const redirectUri = () => location.origin + location.pathname;

/** Уходим на страницу Яндекса; после «Разрешить» Яндекс вернёт нас с токеном в адресе. */
export function startLogin(): void {
  const state = crypto.getRandomValues(new Uint32Array(2)).join('');
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({ response_type: 'token', client_id: YANDEX_CLIENT_ID, redirect_uri: redirectUri(), state });
  location.assign(`https://oauth.yandex.ru/authorize?${params}`);
}

/** Запасной путь (для iPhone): Яндекс показывает код на своей странице, его вставляют в сайт вручную. */
export const manualLoginUrl = () =>
  `https://oauth.yandex.ru/authorize?${new URLSearchParams({ response_type: 'token', client_id: YANDEX_CLIENT_ID, redirect_uri: 'https://oauth.yandex.ru/verification_code' })}`;

/**
 * Вызывается при запуске: если мы вернулись от Яндекса, забираем токен из адреса
 * (#access_token=…&state=…) и убираем его из адресной строки.
 */
export function handleLoginRedirect(): void {
  if (!location.hash.includes('access_token=') && !location.hash.includes('error=')) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  const token = p.get('access_token');
  // state защищает от подмены: токен принимаем, только если вход начинали мы сами
  if (token && expected && p.get('state') === expected) saveToken(token, Number(p.get('expires_in')) || undefined);
  history.replaceState(null, '', `${location.pathname}#/profile`);
}

// ---------- Файл на Диске ----------

async function api(path: string, token: string): Promise<Response> {
  const res = await fetch(`${API}/${path}`, { headers: { Authorization: `OAuth ${token}` } });
  if (res.status === 401 || res.status === 403) throw new AuthError('Доступ к Диску больше не действует — подключите заново');
  return res;
}

/** Скачивает data.json. null — файла ещё нет (первая синхронизация). */
export async function downloadData(token: string): Promise<unknown | null> {
  const res = await api(`download?path=${encodeURIComponent(FILE)}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Диск ответил ошибкой ${res.status}`);
  const { href } = (await res.json()) as { href: string };
  const file = await fetch(href);
  if (!file.ok) throw new Error(`Не удалось скачать файл с Диска (${file.status})`);
  return file.json();
}

export async function uploadData(token: string, data: unknown): Promise<void> {
  const res = await api(`upload?path=${encodeURIComponent(FILE)}&overwrite=true`, token);
  if (!res.ok) throw new Error(`Диск ответил ошибкой ${res.status}`);
  const { href, method } = (await res.json()) as { href: string; method: string };
  const put = await fetch(href, { method: method || 'PUT', body: JSON.stringify(data) });
  if (!put.ok) throw new Error(`Не удалось загрузить файл на Диск (${put.status})`);
}
