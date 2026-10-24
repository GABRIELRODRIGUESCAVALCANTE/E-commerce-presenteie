import { useEffect } from 'react';

const DEFAULT_TITLE = 'Presenteie — Presentes especiais com retirada no local';
const DEFAULT_DESCRIPTION =
  'Presentes selecionados com carinho para surpreender quem você ama. Compre online, retire no local e pague na retirada com cartão, PIX ou dinheiro.';

/** Atualiza título e descrição da página (SEO e histórico do navegador). */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Presenteie` : DEFAULT_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description || DEFAULT_DESCRIPTION);
  }, [title, description]);
}
