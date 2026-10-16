// Профиль: категории, источники, карты и тема.
import { useTheme, type ThemeChoice } from '../app/theme';
import { CardsCard } from '../components/CardsCard';
import { NamedListCard } from '../components/NamedListCard';

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function Profile() {
  const { choice, setChoice } = useTheme();
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
