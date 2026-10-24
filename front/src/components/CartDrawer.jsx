import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import QuantityStepper from './QuantityStepper';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useDialog } from '../hooks/useDialog';
import { formatPreco, imageUrl, productPath } from '../utils/format';

export default function CartDrawer() {
  const { items, count, subtotal, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  useDialog(isOpen, closeCart, panelRef);

  const irParaCheckout = () => {
    closeCart();
    navigate(user ? '/checkout' : '/auth?redirect=/checkout');
  };

  return (
    <div className={`drawer drawer--right ${isOpen ? 'drawer--open' : ''}`} inert={!isOpen}>
      <div className="drawer__overlay" onClick={closeCart} />
      <div
        ref={panelRef}
        className="drawer__panel cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
      >
        <div className="drawer__header">
          <h2 id="cart-drawer-title" className="drawer__title">
            Seu carrinho {count > 0 && <span className="drawer__count">({count})</span>}
          </h2>
          <button type="button" className="icon-btn" onClick={closeCart} aria-label="Fechar carrinho">
            <Icon name="x" size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer__body cart-drawer__empty">
            <span className="empty-state__icon"><Icon name="bag" size={28} /></span>
            <p className="cart-drawer__empty-title">Seu carrinho está vazio</p>
            <p className="muted">Explore a vitrine e encontre o presente perfeito.</p>
            <Link to="/#catalogo" className="btn btn--primary" onClick={closeCart}>Ver presentes</Link>
          </div>
        ) : (
          <>
            <ul className="drawer__body cart-lines">
              {items.map((item) => (
                <li key={item.id} className="cart-line">
                  <Link to={productPath(item)} className="cart-line__thumb" onClick={closeCart} tabIndex={-1} aria-hidden="true">
                    <img src={imageUrl(item.imagem_url, 160)} alt="" loading="lazy" width="80" height="80" />
                  </Link>
                  <div className="cart-line__info">
                    <Link to={productPath(item)} className="cart-line__name" onClick={closeCart}>{item.nome}</Link>
                    <p className="cart-line__unit">{formatPreco(item.preco)} cada</p>
                    <div className="cart-line__controls">
                      <QuantityStepper
                        size="sm"
                        value={item.quantidade}
                        min={0}
                        max={Number(item.estoque)}
                        onChange={(q) => updateQuantity(item.id, q)}
                        label={`Quantidade de ${item.nome}`}
                      />
                      <button type="button" className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.nome}`}>
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="cart-line__total">{formatPreco(Number(item.preco) * item.quantidade)}</p>
                </li>
              ))}
            </ul>

            <div className="drawer__footer cart-drawer__footer">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPreco(subtotal)}</span>
              </div>
              <div className="summary-row summary-row--muted">
                <span>Retirada no local</span>
                <span className="text-success">Grátis</span>
              </div>
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span>{formatPreco(subtotal)}</span>
              </div>
              <button type="button" className="btn btn--primary btn--lg btn--block" onClick={irParaCheckout}>
                Finalizar compra <Icon name="arrowRight" size={18} />
              </button>
              <Link to="/carrinho" className="btn btn--ghost btn--block" onClick={closeCart}>Ver carrinho completo</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
