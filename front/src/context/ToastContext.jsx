import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToastContext } from './contexts';
import Icon from '../components/Icon';

const ICONS = { success: 'checkCircle', error: 'alert', warning: 'alert', info: 'info' };
const DURATION = 4500;

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  /**
   * Exibe uma notificação. `options.action` aceita { label, onClick } para um botão de ação.
   */
  const showToast = useCallback((message, type = 'success', options = {}) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-3), { id, message, type, action: options.action }]);
    timers.current.set(id, setTimeout(() => removeToast(id), options.duration || DURATION));
  }, [removeToast]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <Icon name={ICONS[toast.type] || 'info'} size={20} className="toast__icon" />
            <p className="toast__message">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action.onClick();
                  removeToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Fechar notificação"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
