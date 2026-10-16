// Профиль: категории, источники, карты и тема.
import { useTheme, type ThemeChoice } from '../app/theme';
import { CardsCard } from '../components/CardsCard';
import { NamedListCard } from '../components/NamedListCard';
import { useNames } from '../data/hooks';
import * as repo from '../data/repo';
import { downloadText, expensesToCsv } from '../lib/csv';
import { todayISO } from '../lib/dates';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function Profile() {
  const { choice, setChoice } = useTheme();
  const name = useNames();

  async function exportCsv() {
    const items = await repo.allExpenses();
    downloadText(`whered-it-go-${todayISO()}.csv`, expensesToCsv(items, name));
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Профиль</h1>
      </header>
      <div className="grid grid-2">
        <NamedListCard kind="categories" />
        <div className="grid">
          <NamedListCard kind="sources" />
          <CardsCard />
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Резервная копия</h2>
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>
              Все расходы одним файлом CSV — откроется в Excel.
            </p>
            <button className="btn btn-ghost btn-block" onClick={exportCsv}>
              Скачать CSV
            </button>
          </section>
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Тема</h2>
            </div>
            <div className="chips">
              {THEMES.map((t) => (
                <button key={t.value} className={`chip ${choice === t.value ? 'on' : ''}`} onClick={() => setChoice(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
