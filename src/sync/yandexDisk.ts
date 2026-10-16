// Вход через Яндекс (OAuth) и работа с файлом data.json в папке приложения на Диске.
// Сайт получает доступ ТОЛЬКО к своей папке «Приложения/Where'd It Go», остальные файлы ему не видны.

/** ClientID приложения с oauth.yandex.ru. Он не секретный: его видит любой, кто открывает страницу входа. */
export const YANDEX_CLIENT_ID = '8516e839c92c4169af2f842d5580b5a1';

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

/** Запрос не дошёл до сервера (нет сети или браузер его заблокировал). step — на каком шаге. */
export class NetworkError extends Error {
  constructor(
    public step: string,
    cause: unknown,
  ) {
    super(`${step}: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

/** fetch, который при сетевой ошибке сообщает, на каком шаге она случилась. */
async function request(step: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    console.error(`Синхронизация, шаг «${step}»:`, url.split('?')[0], e);
    throw new NetworkError(step, e);
  }
}

async function api(step: string, path: string, token: string): Promise<Response> {
  const res = await request(step, `${API}/${path}`, { headers: { Authorization: `OAuth ${token}` } });
  if (res.status === 401 || res.status === 403) throw new AuthError('Доступ к Диску больше не действует — подключите заново');
  return res;
}

/** Скачивает data.json. null — файла ещё нет (первая синхронизация). */
export async function downloadData(token: string): Promise<unknown | null> {
  const res = await api('ссылка на скачивание', `download?path=${encodeURIComponent(FILE)}`, token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Диск ответил ошибкой ${res.status}`);
  const { href } = (await res.json()) as { href: string };
  const file = await fetchFile(href, token);
  if (!file.ok) throw new Error(`Не удалось скачать файл с Диска (${file.status})`);
  return file.json();
}

/**
 * Safari на iPhone иногда не пускает обычный запрос к серверу скачивания («Load failed»),
 * хотя Chrome его пропускает. Пробуем несколько вариантов запроса по очереди.
 */
const DOWNLOAD_VARIANTS: { name: string; init: (token: string) => RequestInit }[] = [
  { name: 'обычный', init: () => ({}) },
  { name: 'с ключом доступа', init: (token) => ({ headers: { Authorization: `OAuth ${token}` } }) },
  { name: 'без кэша и Referer', init: () => ({ cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }) },
];
const VARIANT_KEY = 'yadisk-download-variant';

async function fetchFile(href: string, token: string): Promise<Response> {
  // Сначала тот вариант, что сработал в прошлый раз на этом устройстве
  const saved = Number(localStorage.getItem(VARIANT_KEY)) || 0;
  const order = [saved, ...DOWNLOAD_VARIANTS.keys()].filter((v, i, a) => a.indexOf(v) === i && DOWNLOAD_VARIANTS[v]);
  const errors: string[] = [];
  for (const i of order) {
    const v = DOWNLOAD_VARIANTS[i];
    try {
      const res = await fetch(href, v.init(token));
      localStorage.setItem(VARIANT_KEY, String(i));
      if (errors.length) console.info(`Скачивание сработало вариантом «${v.name}» после ошибок:`, errors);
      return res;
    } catch (e) {
      errors.push(`${v.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.error('Скачивание файла не удалось ни одним вариантом:', errors);
  throw new NetworkError('скачивание файла', new Error(errors.join('; ')));
}

export async function uploadData(token: string, data: unknown): Promise<void> {
  const res = await api('ссылка на загрузку', `upload?path=${encodeURIComponent(FILE)}&overwrite=true`, token);
  if (!res.ok) throw new Error(`Диск ответил ошибкой ${res.status}`);
  const { href, method } = (await res.json()) as { href: string; method: string };
  const put = await request('загрузка файла', href, { method: method || 'PUT', body: JSON.stringify(data) });
  if (!put.ok) throw new Error(`Не удалось загрузить файл на Диск (${put.status})`);
}
