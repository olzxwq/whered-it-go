// Первый запуск: выбор источников денег (хотя бы один).
// На новом устройстве можно сначала подключить Яндекс Диск и забрать данные оттуда.
import { useState } from 'react';
import { APP_NAME } from '../app/AppShell';
import { Icon } from '../components/Icon';
import { ConnectDisk } from '../components/SyncCard';
import { SUGGESTED_SOURCES } from '../data/defaults';
import * as repo from '../data/repo';
import { titleKey } from '../lib/suggest';
import { useSyncStatus } from '../sync/sync';
import { YANDEX_CLIENT_ID } from '../sync/yandexDisk';

export function Onboarding() {
  const sync = useSyncStatus();
  const brand = (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="wallet" />
      </span>
      <span>{APP_NAME}</span>
    </div>
  );

  // Диск подключён, но данных с него пока нет (или они ещё загружаются)
  if (sync.connected) {
    return (
      <div className="onboarding">
        {brand}
        {sync.syncing ? (
          <h1>Загружаю данные с Диска…</h1>
        ) : (
          <>
            {sync.error && <p className="error">{sync.error}</p>}
            <p className="muted">Яндекс Диск подключён, но данных на нём пока нет.</p>
            <SourcesPicker />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="onboarding">
      {brand}
      <ConnectFromOtherDevice />
      <SourcesPicker />
    </div>
  );
}

function ConnectFromOtherDevice() {
  const [open, setOpen] = useState(false);
  if (!YANDEX_CLIENT_ID) return null;
  return open ? (
    <div className="card">
      <ConnectDisk />
    </div>
  ) : (
    <button className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>
      Уже пользуюсь на другом устройстве
    </button>
  );
}

function SourcesPicker() {
  const [options, setOptions] = useState(SUGGESTED_SOURCES.map((s) => s.name));
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  const toggle = (name: string) => setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  function addCustom() {
    const name = custom.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const existing = options.find((o) => titleKey(o) === titleKey(name));
    if (existing) {
      if (!selected.includes(existing)) toggle(existing);
    } else {
      setOptions([...options, name]);
      setSelected([...selected, name]);
    }
    setCustom('');
  }

  async function finish() {
    try {
      await repo.completeOnboarding(selected);
      // App сам заметит изменение и покажет главный экран
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось сохранить');
    }
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 8 }}>
        <h1>Откуда берутся деньги?</h1>
        <p className="muted">Выберите хотя бы один источник. Потом их можно будет изменить в профиле.</p>
      </div>

      <div className="chips">
        {options.map((name) => (
          <button type="button" key={name} className={`chip ${selected.includes(name) ? 'on' : ''}`} onClick={() => toggle(name)}>
            {name}
          </button>
        ))}
      </div>

      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
      >
        <input className="input" placeholder="Свой вариант, например Подработка" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="btn btn-ghost" disabled={!custom.trim()}>
          Добавить
        </button>
      </form>

      {error && <span className="error">{error}</span>}

      <button className="btn btn-primary btn-block" disabled={selected.length === 0} onClick={finish}>
        Продолжить
      </button>
    </>
  );
}
