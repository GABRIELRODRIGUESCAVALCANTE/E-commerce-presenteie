import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Volta ao topo ao trocar de página (mantém âncoras como #catalogo funcionando). */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
