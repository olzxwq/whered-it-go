// Главный экран: итог месяца, сравнение с прошлым, разбивка по источникам, последние расходы.
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { useExpenseSheet } from '../app/ExpenseSheet';
import { ExpenseList } from '../components/ExpenseList';
import { useNames } from '../data/hooks';
import * as repo from '../data/repo';
import { currentMonthKey, monthGenitive, monthPrepositional, shiftMonth, monthTitle } from '../lib/dates';
import { formatRub } from '../lib/money';
import { compareMonths, sumKop, totalsBy } from '../lib/stats';

export function Home() {
  const month = currentMonthKey();
  const prevMonth = shiftMonth(month, -1);
  const current = useLiveQuery(() => repo.expensesInMonth(month), [month]);
  const prev = useLiveQuery(() => repo.expensesInMonth(prevMonth), [prevMonth]);
  const recent = useLiveQuery(() => repo.recentExpenses(5), []);
  const name = useNames();
  const { openAdd } = useExpenseSheet();

  if (!current || !prev || !recent) return null; // данные ещё загружаются (доли секунды)

  const total = sumKop(current);
  const prevTotal = sumKop(prev);
  const cmp = compareMonths(total, prevTotal);
  const bySource = totalsBy(current, 'sourceId');

  let compareText: string;
  if (prevTotal === 0) compareText = `В ${monthPrepositional(prevMonth)} трат не было`;
  else if (cmp.overKop > 0) compareText = `На ${formatRub(cmp.overKop)} больше, чем за весь ${monthTitle(prevMonth).split(' ')[0].toLowerCase()}`;
  else compareText = `${cmp.percent} % от ${monthGenitive(prevMonth)} (${formatRub(prevTotal)})`;

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{monthTitle(month)}</h1>
      </header>

      <div className="grid grid-2">
        <section className="hero span-2" aria-label="Итог за месяц">
          <p className="hero-label">Потрачено в {monthPrepositional(month)}</p>
          <p className="hero-amount num">{formatRub(total)}</p>
          {prevTotal > 0 && (
            <div className="progress" aria-hidden="true">
              <div className={`progress-bar ${cmp.overKop > 0 ? 'over' : ''}`} style={{ width: `${Math.min(cmp.ratio ?? 0, 1) * 100}%` }} />
            </div>
          )}
          <p className="hero-compare">{compareText}</p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">По источникам</h2>
          </div>
          {bySource.length === 0 ? (
            <p className="muted">В этом месяце пока нет трат</p>
          ) : (
            <div className="rows">
              {bySource.map((g) => (
                <div key={g.id}>
                  <div className="row-top">
                    <span>{name(g.id)}</span>
                    <span className="num">{formatRub(g.totalKop)}</span>
                  </div>
                  <div className="row-bar">
                    <div style={{ width: `${(g.totalKop / total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Последние расходы</h2>
            {recent.length > 0 && (
              <Link className="link" to="/expenses">
                Все →
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <p>Расходов пока нет</p>
              <button className="btn btn-primary" onClick={openAdd}>
                Добавить первый расход
              </button>
            </div>
          ) : (
            <ExpenseList items={recent} groupByDay={false} />
          )}
        </section>
      </div>
    </>
  );
}
