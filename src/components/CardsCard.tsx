// Карты в профиле: только банк и необязательное название, никаких номеров.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import type { Card } from '../data/db';
import * as repo from '../data/repo';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { countLabel, errorText } from './NamedListCard';
import { Sheet } from './Sheet';

const cardLabel = (c: Card) => (c.name ? `${c.bank} · ${c.name}` : c.bank);

export function CardsCard() {
  const cards = useLiveQuery(repo.listCards, []) ?? [];
  const counts = useLiveQuery(repo.expenseCounts, []) ?? new Map<string, number>();
  const [editing, setEditing] = useState<Card | 'new' | null>(null);

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Карты</h2>
        <span className="muted">{cards.length}</span>
      </div>

      {cards.length === 0 ? (
        <p className="muted">Необязательно. Если добавить карту, при вводе расхода можно будет указать, чем платили.</p>
      ) : (
        <div className="item-list">
          {cards.map((c) => (
            <button key={c.id} className="item-row" onClick={() => setEditing(c)}>
              <span className="item-name">{cardLabel(c)}</span>
              <span className="muted item-count">{countLabel(counts.get(c.id) ?? 0)}</span>
              <Icon name="right" size={18} />
            </button>
          ))}
        </div>
      )}

      <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setEditing('new')}>
        <Icon name="plus" size={18} />
        Добавить карту
      </button>

      {editing && <CardSheet card={editing === 'new' ? null : editing} count={editing === 'new' ? 0 : counts.get(editing.id) ?? 0} onClose={() => setEditing(null)} />}
    </section>
  );
}

function CardSheet({ card, count, onClose }: { card: Card | null; count: number; onClose: () => void }) {
  const [bank, setBank] = useState(card?.bank ?? '');
  const [name, setName] = useState(card?.name ?? '');
  const [error, setError] = useState('');
  const [asking, setAsking] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (card) await repo.updateCard(card.id, { bank, name });
      else await repo.addCard({ bank, name });
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove() {
    if (!card) return;
    await repo.deleteCard(card.id);
    onClose();
  }

  return (
    <Sheet title={card ? 'Карта' : 'Новая карта'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="field">
          <label className="label" htmlFor="card-bank">
            Банк
          </label>
          <input id="card-bank" className="input" placeholder="Например, Сбербанк" value={bank} onChange={(e) => setBank(e.target.value)} maxLength={40} autoFocus={!card} />
        </div>
        <div className="field">
          <label className="label" htmlFor="card-name">
            Название <span className="opt">— необязательно</span>
          </label>
          <input id="card-name" className="input" placeholder="Например, Зарплатная или Кредитка" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <span className="muted" style={{ fontSize: 13 }}>
            Номер карты и другие реквизиты не нужны и не хранятся.
          </span>
        </div>
        {error && <span className="error">{error}</span>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-block">
            {card ? 'Сохранить' : 'Добавить'}
          </button>
          {card && (
            <button type="button" className="btn btn-danger btn-block" onClick={() => setAsking(true)}>
              Удалить карту
            </button>
          )}
        </div>
      </form>

      {asking && card && (
        <ConfirmDialog
          text={
            count > 0
              ? `Удалить карту «${cardLabel(card)}»? У ${countLabel(count)} просто уберётся привязка к карте, сами расходы останутся.`
              : `Удалить карту «${cardLabel(card)}»?`
          }
          confirmLabel="Удалить"
          onConfirm={remove}
          onCancel={() => setAsking(false)}
        />
      )}
    </Sheet>
  );
}
