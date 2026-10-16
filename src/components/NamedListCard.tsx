// Карточка профиля со списком категорий или источников:
// добавление, переименование и удаление с переносом расходов.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import type { Category } from '../data/db';
import * as repo from '../data/repo';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { MoveDialog } from './MoveDialog';

const TEXT = {
  categories: { title: 'Категории', add: 'Новая категория', edit: 'Категория', one: 'категорию', last: 'Это последняя категория — её нельзя удалить' },
  sources: { title: 'Источники денег', add: 'Новый источник', edit: 'Источник денег', one: 'источник', last: 'Это последний источник — его нельзя удалить' },
} as const;

export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Что-то пошло не так');

export function countLabel(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  const word = d === 1 && dd !== 11 ? 'трата' : d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'траты' : 'трат';
  return `${n} ${word}`;
}

export function NamedListCard({ kind }: { kind: repo.NamedKind }) {
  const t = TEXT[kind];
  const items = useLiveQuery(kind === 'categories' ? repo.listCategories : repo.listSources, [kind]) ?? [];
  const counts = useLiveQuery(repo.expenseCounts, []) ?? new Map<string, number>();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await repo.addNamed(kind, newName);
      setNewName('');
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">{t.title}</h2>
        <span className="muted">{items.length}</span>
      </div>

      <div className="item-list">
        {items.map((item) => (
          <button key={item.id} className="item-row" onClick={() => setEditing(item)}>
            <span className="item-name">{item.name}</span>
            <span className="muted item-count">{countLabel(counts.get(item.id) ?? 0)}</span>
            <Icon name="right" size={18} />
          </button>
        ))}
      </div>

      <form className="add-row" style={{ marginTop: 12 }} onSubmit={add}>
        <input className="input" placeholder={t.add} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} />
        <button type="submit" className="btn btn-ghost" disabled={!newName.trim()}>
          Добавить
        </button>
      </form>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

      {editing && (
        <EditNamedSheet
          kind={kind}
          item={editing}
          others={items.filter((x) => x.id !== editing.id)}
          count={counts.get(editing.id) ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function EditNamedSheet(props: { kind: repo.NamedKind; item: Category; others: Category[]; count: number; onClose: () => void }) {
  const { kind, item, others, count, onClose } = props;
  const t = TEXT[kind];
  const [name, setName] = useState(item.name);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await repo.renameNamed(kind, item.id, name);
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove(moveToId?: string) {
    try {
      await repo.deleteNamed(kind, item.id, moveToId);
      onClose();
    } catch (err) {
      setAsking(false);
      setError(errorText(err));
    }
  }

  return (
    <Sheet title={t.edit} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="field">
          <label className="label" htmlFor="named-name">
            Название
          </label>
          <input id="named-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <span className="muted" style={{ fontSize: 13 }}>
            {count > 0 ? `Привязано: ${countLabel(count)}. Новое название появится и в них.` : 'Расходов с этим названием пока нет.'}
          </span>
        </div>
        {error && <span className="error">{error}</span>}
        {others.length === 0 && <span className="muted">{t.last}</span>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            Сохранить
          </button>
          {others.length > 0 && (
            <button type="button" className="btn btn-danger btn-block" onClick={() => setAsking(true)}>
              Удалить {t.one}
            </button>
          )}
        </div>
      </form>

      {asking && count === 0 && (
        <ConfirmDialog text={`Удалить ${t.one} «${item.name}»?`} confirmLabel="Удалить" onConfirm={() => remove()} onCancel={() => setAsking(false)} />
      )}
      {asking && count > 0 && (
        <MoveDialog
          text={`К «${item.name}» привязано ${countLabel(count)}. Куда их перенести?`}
          options={others}
          onConfirm={(id) => remove(id)}
          onCancel={() => setAsking(false)}
        />
      )}
    </Sheet>
  );
}
