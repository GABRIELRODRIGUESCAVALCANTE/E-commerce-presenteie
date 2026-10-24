import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useCart } from '../hooks/useCart';
import { formatPreco, imageUrl, imageSrcSet, productImage, productPath } from '../utils/format';

const LOW_STOCK = 3;

export default function ProductCard({ produto, isNew = false, priority = false }) {
  const { addItem } = useCart();
  const estoque = Number(produto.estoque);
  const esgotado = estoque <= 0;
  const ultimas = !esgotado && estoque <= LOW_STOCK;
  const foto = productImage(produto);

  return (
    <article className={`product-card ${esgotado ? 'product-card--soldout' : ''}`}>
      <div className="product-card__media">
        <img
          src={imageUrl(foto, 480)}
          srcSet={imageSrcSet(foto, 480)}
          alt={produto.nome}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          width="480"
          height="480"
        />
        <div className="product-card__badges">
          {isNew && !esgotado && <span className="badge badge--brand">Novo</span>}
          {ultimas && <span className="badge badge--warning">Últimas unidades</span>}
          {esgotado && <span className="badge badge--dark">Esgotado</span>}
        </div>
        <button
          type="button"
          className="product-card__add"
          onClick={() => addItem(produto, 1)}
          disabled={esgotado}
          aria-label={esgotado ? `${produto.nome} esgotado` : `Adicionar ${produto.nome} ao carrinho`}
          title={esgotado ? 'Esgotado' : 'Adicionar ao carrinho'}
        >
          <Icon name="plus" size={20} strokeWidth={2.2} />
        </button>
      </div>
      <div className="product-card__body">
        {produto.categoria_nome && <span className="product-card__category">{produto.categoria_nome}</span>}
        <h3 className="product-card__title">
          <Link to={productPath(produto)} className="product-card__link">
            {produto.nome}
          </Link>
        </h3>
        <p className="product-card__price">{formatPreco(produto.preco)}</p>
      </div>
    </article>
  );
}
