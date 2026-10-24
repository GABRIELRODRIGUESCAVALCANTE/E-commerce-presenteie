import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Página não encontrada');
  return (
    <div className="container page">
      <EmptyState icon="search" title="Página não encontrada" description="O endereço pode estar incorreto ou a página foi removida.">
        <Link to="/" className="btn btn--primary">Voltar para a vitrine</Link>
      </EmptyState>
    </div>
  );
}
