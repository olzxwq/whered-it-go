// Статистика за месяц: итог, разбивки (диаграмма + таблица), траты по дням, фильтр по карте.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DailyBars } from '../components/DailyBars';
import { Donut, type DonutSegment } from '../components/Donut';
import { MonthSwitcher } from '../components/MonthSwitcher';
import type { Expense } from '../data/db';
import { useCards, useNames } from '../data/hooks';
import * as repo from '../data/repo';
import { currentMonthKey, daysInMonth } from '../lib/dates';
import { formatRub } from '../lib/money';
import { assignSlots, breakdown, dailyTotals, formatPercent, NO_TITLE, sumKop, type BreakdownRow } from '../lib/stats';
import { buildTitleIndex, titleKey } from '../lib/suggest';

type Dim = 'category' | 'source' | 'title';
const DIMS: { value: Dim; label: string }[] = [
  { value: 'category', label: 'Категории' },
  { value: 'source', label: 'Источники' },
  { value: 'title', label: 'Названия' },
];
const NO_CARD = 'none';
const OTHER = '__other__';
const slotColor = (slot: number | undefined) => (slot ? `var(--series-${slot})` : 'var(--series-other)');

export function Stats() {
  const [params, setParams] = useSearchParams();
  const month = params.get('month') ?? currentMonthKey();
  const cardFilter = params.get('card') ?? '';
  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const [dim, setDim] = useState<Dim>('category');
  const [activeId, setActiveId] = useState<string | null>(null);
  const cards = useCards() ?? [];
  const name = useNames();
  const all = useLiveQuery(() => repo.expensesInMonth(month), [month]);

  const items = useMemo(
    () => (all ?? []).filter((e) => !cardFilter || (cardFilter === NO_CARD ? !e.cardId : e.cardId === cardFilter)),
    [all, cardFilter],
  );

  // Ключ и подпись группы для выбранной разбивки
  const { key, label } = useMemo(() => {
    const titles = new Map(buildTitleIndex((all ?? []).map((e) => e.title)).map((t) => [t.key, t.title]));
    const byDim = {
      category: { key: (e: Expense) => e.categoryId, label: (id: string) => name(id) },
      source: { key: (e: Expense) => e.sourceId, label: (id: string) => name(id) },
      title: {
        key: (e: Expense) => (e.title ? titleKey(e.title) : NO_TITLE),
        label: (id: string) => (id === NO_TITLE ? 'Без названия' : titles.get(id) ?? id),
      },
    };
    return byDim[dim];
  }, [dim, all, name]);

  // Цвета закрепляем по всему месяцу (без фильтра), чтобы фильтр не перекрашивал группы
  const slots = useMemo(() => assignSlots(breakdown(all ?? [], key, label)), [all, key, label]);
  const rows = breakdown(items, key, label);
  const total = sumKop(items);

  const segments: DonutSegment[] = [];
  let otherKop = 0;
  for (const r of rows) {
    const slot = slots.get(r.id);
    if (slot) segments.push({ id: r.id, label: r.label, valueKop: r.totalKop, color: slotColor(slot) });
    else otherKop += r.totalKop;
  }
  if (otherKop > 0) segments.push({ id: OTHER, label: 'Остальное', valueKop: otherKop, color: slotColor(undefined) });

  if (!all) return null;

  return (
    <>
      <header className="page-head" style={{ flexWrap: 'wrap' }}>
        <h1 className="page-title">Статистика</h1>
        <MonthSwitcher month={month} onChange={(m) => set('month', m === currentMonthKey() ? '' : m)} />
      </header>

      {cards.length > 0 && (
        <div className="chips filter-row" role="group" aria-label="Фильтр по карте">
          <button className={`chip ${cardFilter === '' ? 'on' : ''}`} onClick={() => set('card', '')}>
            Все
          </button>
          {cards.map((c) => (
            <button key={c.id} className={`chip ${cardFilter === c.id ? 'on' : ''}`} onClick={() => set('card', c.id)}>
              {c.name ? `${c.bank} · ${c.name}` : c.bank}
            </button>
          ))}
          <button className={`chip ${cardFilter === NO_CARD ? 'on' : ''}`} onClick={() => set('card', NO_CARD)}>
            Без карты
          </button>
        </div>
      )}

      <div className="grid grid-2">
        <section className="hero span-2">
          <p className="hero-label">Итог за месяц</p>
          <p className="hero-amount num" style={{ marginBottom: 4 }}>
            {formatRub(total)}
          </p>
          <p className="hero-compare">{countLabel(items.length)}</p>
        </section>

        {items.length === 0 ? (
          <section className="card empty span-2">{all.length ? 'С этим фильтром трат нет' : 'В этом месяце трат нет'}</section>
        ) : (
          <>
            <section className="card">
              <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
                <h2 className="card-title">Разбивка</h2>
                <div className="segmented" role="tablist">
                  {DIMS.map((d) => (
                    <button
                      key={d.value}
                      role="tab"
                      aria-selected={dim === d.value}
                      className={dim === d.value ? 'on' : ''}
                      onClick={() => {
                        setDim(d.value);
                        setActiveId(null);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <Donut segments={segments} totalKop={total} activeId={activeId} onActive={setActiveId} />
              <BreakdownTable rows={rows} slots={slots} activeId={activeId} onActive={setActiveId} />
            </section>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">По дням</h2>
              </div>
              <DailyBars month={month} values={dailyTotals(items, daysInMonth(month))} />
            </section>
          </>
        )}
      </div>
    </>
  );
}

function BreakdownTable(props: { rows: BreakdownRow[]; slots: Map<string, number>; activeId: string | null; onActive: (id: string | null) => void }) {
  const { rows, slots, activeId, onActive } = props;
  return (
    <table className="breakdown">
      <thead>
        <tr>
          <th>Название</th>
          <th className="r">Сумма</th>
          <th className="r">%</th>
          <th className="r">Трат</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const slot = slots.get(r.id);
          const segId = slot ? r.id : OTHER;
          return (
            <tr key={r.id} className={activeId === segId ? 'on' : ''} onClick={() => onActive(activeId === segId ? null : segId)}>
              <td>
                <span className="dot" style={{ background: slotColor(slot) }} />
                {r.label}
              </td>
              <td className="r num">{formatRub(r.totalKop)}</td>
              <td className="r num">{formatPercent(r.share)}</td>
              <td className="r num">{r.count}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function countLabel(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return `${n} трата`;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return `${n} траты`;
  return `${n} трат`;
}
