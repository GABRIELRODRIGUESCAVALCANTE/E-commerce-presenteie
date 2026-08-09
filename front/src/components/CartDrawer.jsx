import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../auth';
import { useToast } from '../context/ToastContext';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1549465220-1a50b2538e03?w=100&h=100&fit=crop';

export default function CartDrawer({
  isOpen,
  onClose,
  carrinho,
  atualizarQuantidade,
  removerDoCarrinho,
}) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { showToast } = useToast();

  const valorTotal = carrinho.reduce(
    (total, item) => total + Number(item.preco) * item.quantidade,
    0
  );

  const irParaCheckout = () => {
    if (!session) {
      showToast('Faça login para finalizar a compra.', 'warning');
      onClose();
      navigate('/auth');
      return;
    }
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'drawer-overlay--visible' : ''}`}
        onClick={onClose}
        role="presentation"
      />
      <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`} aria-hidden={!isOpen}>
        <div className="cart-drawer-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Seu Carrinho
          </h2>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fechar carrinho">
            ×
          </button>
        </div>

        <div className="cart-drawer-body">
          {carrinho.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon"></div>
              <p>Seu carrinho está vazio</p>
              <span>Explore nossa vitrine e encontre o presente perfeito!</span>
              <Link to="/" className="btn btn-secondary" onClick={onClose}>
                Ver Presentes
              </Link>
            </div>
          ) : (
            <ul className="cart-items-list">
              {carrinho.map((item) => (
                <li key={item.id} className="cart-drawer-item">
                  <img
                    src={item.imagem_url || item.imagem || PLACEHOLDER_IMG}
                    alt={item.nome}
                    className="cart-item-thumb"
                  />
                  <div className="cart-item-details">
                    <h4>{item.nome}</h4>
                    <p className="cart-item-price">R$ {Number(item.preco).toFixed(2)}</p>
                    <div className="qty-controls qty-controls--sm">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                        aria-label="Diminuir"
                      >
                        −
                      </button>
                      <span className="qty-value">{item.quantidade}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <span className="cart-item-subtotal">
                      R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removerDoCarrinho(item.id)}
                      aria-label="Remover item"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {carrinho.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-total-row">
              <span>Total</span>
              <strong>R$ {valorTotal.toFixed(2)}</strong>
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={irParaCheckout}>
              Finalizar Compra
            </button>
            <Link to="/carrinho" className="btn btn-ghost btn-block" onClick={onClose}>
              Ver carrinho completo
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
