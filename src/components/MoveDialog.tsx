// Вопрос «куда перенести расходы» при удалении категории или источника.
import { useState } from 'react';

export function MoveDialog(props: {
  text: string;
  options: { id: string; name: string }[];
  onConfirm: (moveToId: string) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(props.options[0]?.id ?? '');
  return (
    <div className="overlay" style={{ alignItems: 'center', zIndex: 60 }} onClick={props.onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>{props.text}</p>
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Куда перенести">
          {props.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={props.onCancel}>
            Отмена
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--danger)', color: '#fff' }} disabled={!target} onClick={() => props.onConfirm(target)}>
            Перенести и удалить
          </button>
        </div>
      </div>
    </div>
  );
}
