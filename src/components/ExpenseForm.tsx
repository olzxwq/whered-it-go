// Форма добавления и исправления расхода.
// Порядок полей — под «пару касаний»: сумма → категория → «Сохранить».
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type FormEvent } from 'react';
import type { Expense } from '../data/db';
import { useCards, useCategories, useSources } from '../data/hooks';
import * as repo from '../data/repo';
import { todayISO, yesterdayISO } from '../lib/dates';
import { kopToInput, parseAmount } from '../lib/money';
import { buildTitleIndex, canonicalTitle, matchTitles } from '../lib/suggest';
import { ConfirmDialog } from './ConfirmDialog';

export function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const categories = useCategories() ?? [];
  const sources = useSources() ?? [];
  const cards = useCards() ?? [];
  const lastSourceId = useLiveQuery(() => repo.getSetting<string>('lastSourceId'), []);
  const titles = useLiveQuery(repo.allTitles, []);
  const titleIndex = useMemo(() => buildTitleIndex(titles ?? []), [titles]);

  const [amount, setAmount] = useState(expense ? kopToInput(expense.amountKop) : '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '');
  const [pickedSource, setPickedSource] = useState(expense?.sourceId ?? '');
  const [cardId, setCardId] = useState(expense?.cardId ?? '');
  const [title, setTitle] = useState(expense?.title ?? '');
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? todayISO());
  const [titleFocused, setTitleFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Источник по умолчанию — тот, что был в прошлый раз
  const sourceId = pickedSource || (sources.some((s) => s.id === lastSourceId) ? lastSourceId! : sources[0]?.id ?? '');
  const suggestions = titleFocused ? matchTitles(titleIndex, title) : [];
  const today = todayISO();
  const yesterday = yesterdayISO();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amountKop = parseAmount(amount);
    const next: Record<string, string> = {};
    if (amountKop === null) next.amount = 'Введите сумму больше нуля, например 250 или 1250,50';
    if (!categoryId) next.category = 'Выберите категорию';
    if (!sourceId) next.source = 'Выберите источник';
    if (!spentOn || spentOn > today) next.date = 'Выберите дату не позже сегодняшней';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: repo.ExpenseInput = {
      amountKop: amountKop!,
      categoryId,
      sourceId,
      cardId: cardId || null,
      title: canonicalTitle(titleIndex, title),
      spentOn,
    };
    setSaving(true);
    try {
      if (expense) await repo.updateExpense(expense.id, input);
      else await repo.addExpense(input);
      onDone();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Не удалось сохранить' });
      setSaving(false);
    }
  }

  async function remove() {
    if (!expense) return;
    await repo.deleteExpense(expense.id);
    onDone();
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label className="label" htmlFor="amount">
          Сумма, ₽
        </label>
        <input
          id="amount"
          className="input amount-input num"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          autoFocus={!expense}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {errors.amount && <span className="error">{errors.amount}</span>}
      </div>

      <div className="field">
        <span className="label">Категория</span>
        <div className="chips">
          {categories.map((c) => (
            <button type="button" key={c.id} className={`chip ${c.id === categoryId ? 'on' : ''}`} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        {errors.category && <span className="error">{errors.category}</span>}
      </div>

      <div className="field">
        <span className="label">Откуда деньги</span>
        <div className="chips">
          {sources.map((s) => (
            <button type="button" key={s.id} className={`chip ${s.id === sourceId ? 'on' : ''}`} onClick={() => setPickedSource(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        {errors.source && <span className="error">{errors.source}</span>}
      </div>

      <div className="field">
        <label className="label" htmlFor="title">
          Название <span className="opt">— необязательно</span>
        </label>
        <input
          id="title"
          className="input"
          autoComplete="off"
          placeholder="Например, Пятёрочка"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          // Задержка, чтобы успело сработать нажатие на подсказку
          onBlur={() => setTimeout(() => setTitleFocused(false), 150)}
        />
        {suggestions.length > 0 && (
          <div className="chips">
            {suggestions.map((s) => (
              <button type="button" key={s.key} className="chip chip-soft" onClick={() => setTitle(s.title)}>
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="field">
          <label className="label" htmlFor="card">
            Карта <span className="opt">— необязательно</span>
          </label>
          <select id="card" className="select" value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="">Без карты</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ? `${c.bank} · ${c.name}` : c.bank}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <span className="label">Дата</span>
        <div className="chips">
          <button type="button" className={`chip ${spentOn === today ? 'on' : ''}`} onClick={() => setSpentOn(today)}>
            Сегодня
          </button>
          <button type="button" className={`chip ${spentOn === yesterday ? 'on' : ''}`} onClick={() => setSpentOn(yesterday)}>
            Вчера
          </button>
          <input
            type="date"
            className="input"
            style={{ width: 'auto', minHeight: 40, flex: '1 1 150px' }}
            aria-label="Другая дата"
            max={today}
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
          />
        </div>
        {errors.date && <span className="error">{errors.date}</span>}
      </div>

      {errors.form && <span className="error">{errors.form}</span>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {expense ? 'Сохранить изменения' : 'Сохранить'}
        </button>
        {expense && (
          <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
            Удалить расход
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog text="Удалить этот расход? Отменить будет нельзя." confirmLabel="Удалить" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
      )}
    </form>
  );
}
