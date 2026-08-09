import { useState } from 'react';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1549465220-1a50b2538e03?w=600&h=600&fit=crop';

export default function ProductModal({ produto, onClose, onAddToCart }) {
  const [quantidade, setQuantidade] = useState(1);

  if (!produto) return null;

  const imagem = produto.imagem_url || produto.imagem || PLACEHOLDER_IMG;
  const preco = Number(produto.preco).toFixed(2);

  const handleAdd = () => {
    onAddToCart(produto, quantidade);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content product-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <div className="product-modal-grid">
          <div className="product-modal-image-wrap">
            <img src={imagem} alt={produto.nome} className="product-modal-image" />
          </div>

          <div className="product-modal-info">
            {produto.categoria_nome && (
              <span className="product-modal-category">{produto.categoria_nome}</span>
            )}
            <h2 id="product-modal-title">{produto.nome}</h2>
            <p className="product-modal-price">R$ {preco}</p>
            <p className="product-modal-desc">
              {produto.descricao || 'Um presente especial, escolhido com carinho para surpreender quem você ama.'}
            </p>

            {produto.estoque != null && (
              <p className="product-modal-stock">
                {produto.estoque > 0 ? `${produto.estoque} unidades disponíveis` : 'Estoque esgotado'}
              </p>
            )}

            <div className="qty-selector">
              <span className="qty-label">Quantidade</span>
              <div className="qty-controls">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  −
                </button>
                <span className="qty-value">{quantidade}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantidade((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>
            </div>

            <button type="button" className="btn btn-primary btn-lg" onClick={handleAdd}>
              Adicionar ao Carrinho — R$ {(Number(produto.preco) * quantidade).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
