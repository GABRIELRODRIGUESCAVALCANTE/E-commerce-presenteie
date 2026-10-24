import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import QuantityStepper from '../components/QuantityStepper';
import EmptyState from '../components/EmptyState';
import PickupInfo from '../components/PickupInfo';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { usePageMeta } from '../hooks/usePageMeta';
import { formatPreco, imageUrl, productPath } from '../utils/format';

export default function CartPage() {
  const { items, count, subtotal, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageMeta('Carrinho');

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="bag" title="Seu carrinho está vazio" description="Que tal encontrar um presente especial para alguém querido?">
          <Link to="/#catalogo" className="btn btn--primary">Explorar vitrine</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-title">Seu carrinho</h1>
        <p className="page-subtitle">{count} {count === 1 ? 'item' : 'itens'} · Revise seus presentes antes de finalizar</p>
      </header>

      <div className="cart-layout">
        <section aria-label="Itens do carrinho" className="card cart-list">
          <ul>
            {items.map((item) => (
              <li key={item.id} className="cart-item">
                <Link to={productPath(item)} className="cart-item__thumb" tabIndex={-1} aria-hidden="true">
                  <img src={imageUrl(item.imagem_url, 200)} alt="" width="96" height="96" loading="lazy" />
                </Link>
                <div className="cart-item__info">
                  <Link to={productPath(item)} className="cart-item__name">{item.nome}</Link>
                  <p className="cart-item__unit">{formatPreco(item.preco)} cada</p>
                  <div className="cart-item__controls">
                    <QuantityStepper
                      size="sm"
                      value={item.quantidade}
                      min={0}
                      max={Number(item.estoque)}
                      onChange={(q) => updateQuantity(item.id, q)}
                      label={`Quantidade de ${item.nome}`}
                    />
                    <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => removeItem(item.id)}>
                      <Icon name="trash" size={16} /> Remover
                    </button>
                  </div>
                </div>
                <p className="cart-item__total">{formatPreco(Number(item.preco) * item.quantidade)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="cart-summary" aria-label="Resumo do pedido">
          <div className="card card--padded summary">
            <h2 className="summary__title">Resumo</h2>
            <div className="summary-row"><span>Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span><span>{formatPreco(subtotal)}</span></div>
            <div className="summary-row summary-row--muted"><span>Retirada no local</span><span className="text-success">Grátis</span></div>
            <div className="summary-row summary-row--total"><span>Total</span><span>{formatPreco(subtotal)}</span></div>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => navigate(user ? '/checkout' : '/auth?redirect=/checkout')}
            >
              Finalizar compra <Icon name="arrowRight" size={18} />
            </button>
            <Link to="/#catalogo" className="btn btn--ghost btn--block">
              <Icon name="arrowLeft" size={18} /> Continuar comprando
            </Link>
            <p className="summary__note"><Icon name="shield" size={16} /> Você só paga na retirada.</p>
          </div>
          <PickupInfo compact />
        </aside>
      </div>
    </div>
  );
}
