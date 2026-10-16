// Список расходов за месяц с фильтрами и поиском по названию.
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { ExpenseList } from '../components/ExpenseList';
import { useCards, useCategories, useSources } from '../data/hooks';
import * as repo from '../data/repo';
import { currentMonthKey } from '../lib/dates';
import { formatRub } from '../lib/money';
import { sumKop } from '../lib/stats';
import { titleKey } from '../lib/suggest';

const NO_CARD = 'none';

export function Expenses() {
  // Фильтры живут в адресе страницы: после «Назад» они сохраняются
  const [params, setParams] = useSearchParams();
  const month = params.get('month') ?? currentMonthKey();
  const categoryId = params.get('category') ?? '';
  const sourceId = params.get('source') ?? '';
  const cardId = params.get('card') ?? '';
  const q = params.get('q') ?? '';

  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const categories = useCategories() ?? [];
  const sources = useSources() ?? [];
  const cards = useCards() ?? [];
  const items = useLiveQuery(() => repo.expensesInMonth(month), [month]);

  const query = titleKey(q);
  const filtered = (items ?? []).filter(
    (e) =>
      (!categoryId || e.categoryId === categoryId) &&
      (!sourceId || e.sourceId === sourceId) &&
      (!cardId || (cardId === NO_CARD ? !e.cardId : e.cardId === cardId)) &&
      (!query || (e.title !== null && titleKey(e.title).includes(query))),
  );
  const hasFilters = Boolean(categoryId || sourceId || cardId || q);

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Расходы</h1>
      </header>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <MonthSwitcher month={month} onChange={(m) => set('month', m === currentMonthKey() ? '' : m)} />
          <span className="muted num" style={{ fontWeight: 600 }}>
            {formatRub(sumKop(filtered))} · {filtered.length} {plural(filtered.length)}
          </span>
        </div>

        <div className="filters">
          <input className="input" type="search" placeholder="Поиск по названию" value={q} onChange={(e) => set('q', e.target.value)} />
          <select className="select" value={categoryId} onChange={(e) => set('category', e.target.value)} aria-label="Категория">
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="select" value={sourceId} onChange={(e) => set('source', e.target.value)} aria-label="Источник">
            <option value="">Все источники</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {cards.length > 0 && (
            <select className="select" value={cardId} onChange={(e) => set('card', e.target.value)} aria-label="Карта">
              <option value="">Все карты</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ? `${c.bank} · ${c.name}` : c.bank}
                </option>
              ))}
              <option value={NO_CARD}>Без карты</option>
            </select>
          )}
        </div>

        {items && filtered.length === 0 ? (
          <p className="empty">{hasFilters ? 'Ничего не найдено' : 'В этом месяце расходов нет'}</p>
        ) : (
          <ExpenseList items={filtered} />
        )}
      </div>
    </>
  );
}

function plural(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return 'трата';
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'траты';
  return 'трат';
}
