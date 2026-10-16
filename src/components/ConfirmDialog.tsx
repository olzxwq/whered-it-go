export function ConfirmDialog(props: { text: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="overlay" style={{ alignItems: 'center', zIndex: 60 }} onClick={props.onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontWeight: 600 }}>{props.text}</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={props.onCancel}>
            Отмена
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={props.onConfirm}>
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
