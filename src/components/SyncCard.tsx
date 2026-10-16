// Карточка «Синхронизация» в профиле (и кнопка подключения на первом запуске).
import { useEffect, useState } from 'react';
import { connectWithToken, disconnect, syncNow, useSyncStatus } from '../sync/sync';
import { manualLoginUrl, startLogin, YANDEX_CLIENT_ID } from '../sync/yandexDisk';
import { errorText } from './NamedListCard';

function ago(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(ts).toLocaleDateString('ru-RU');
}

export function SyncCard() {
  const s = useSyncStatus();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Синхронизация</h2>
      </div>
      {s.connected ? (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            Яндекс Диск подключён.{' '}
            {s.syncing ? 'Синхронизирую…' : s.lastSyncAt ? `Синхронизировано ${ago(s.lastSyncAt, now)}.` : ''}
          </p>
          {s.error && <p className="error" style={{ marginBottom: 12 }}>{s.error}</p>}
          <div className="add-row">
            <button className="btn btn-ghost" style={{ flex: 1 }} disabled={s.syncing} onClick={() => void syncNow()}>
              Синхронизировать
            </button>
            <button className="btn btn-danger" onClick={disconnect}>
              Отключить
            </button>
          </div>
        </>
      ) : (
        <ConnectDisk />
      )}
    </section>
  );
}

/** Кнопка «Подключить Яндекс Диск» и запасной вход по коду. */
export function ConnectDisk() {
  const s = useSyncStatus();
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!YANDEX_CLIENT_ID) return <p className="muted">Синхронизация ещё не настроена.</p>;

  async function submit() {
    setBusy(true);
    try {
      await connectWithToken(code);
      setError('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p className="muted">Данные будут храниться в папке приложения на вашем Яндекс Диске и появятся на всех устройствах.</p>
      {s.error && <p className="error">{s.error}</p>}
      <button className="btn btn-primary btn-block" onClick={startLogin}>
        Подключить Яндекс Диск
      </button>
      {!manual ? (
        <button className="link" style={{ justifySelf: 'center' }} onClick={() => setManual(true)}>
          Не получается? Войти по коду
        </button>
      ) : (
        <div className="field">
          <span className="label">
            1. Откройте{' '}
            <a href={manualLoginUrl()} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
              страницу Яндекса
            </a>{' '}
            и нажмите «Разрешить». 2. Скопируйте код и вставьте сюда:
          </span>
          <div className="add-row">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код от Яндекса" autoComplete="off" />
            <button className="btn btn-ghost" disabled={!code.trim() || busy} onClick={() => void submit()}>
              Готово
            </button>
          </div>
          {error && <span className="error">{error}</span>}
        </div>
      )}
    </div>
  );
}
