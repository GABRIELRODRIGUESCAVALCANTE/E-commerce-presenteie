import { useRef } from 'react';
import { useDialog } from '../hooks/useDialog';
import Icon from './Icon';

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null);
  useDialog(open, onCancel, panelRef);
  if (!open) return null;

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={panelRef}
        className="modal__panel modal__panel--sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        tabIndex={-1}
      >
        <span className={`modal__icon modal__icon--${tone}`}>
          <Icon name={tone === 'danger' ? 'trash' : 'info'} size={22} />
        </span>
        <h2 id="confirm-dialog-title" className="modal__title">{title}</h2>
        <div id="confirm-dialog-desc" className="modal__text">{children}</div>
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
