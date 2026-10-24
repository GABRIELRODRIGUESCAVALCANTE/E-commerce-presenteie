import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamento acessível para modais e gavetas: fecha com Esc, mantém o foco dentro do
 * painel enquanto aberto, devolve o foco ao elemento de origem e trava a rolagem da página.
 */
export function useDialog(isOpen, onClose, panelRef) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusables = () => Array.from(panel?.querySelectorAll(FOCUSABLE) || []);
    const first = panel?.querySelector('[data-autofocus]') || focusables()[0] || panel;
    requestAnimationFrame(() => first?.focus());

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const [firstItem, lastItem] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isOpen, panelRef]);
}
