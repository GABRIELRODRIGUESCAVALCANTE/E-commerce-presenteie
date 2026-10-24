import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon, { WhatsAppIcon } from '../components/Icon';
import QuantityStepper from '../components/QuantityStepper';
import PickupInfo from '../components/PickupInfo';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { getProduto, getProdutos } from '../api';
import { getErrorMessage } from '../api/client';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { whatsappLink } from '../config/store';
import { formatPreco, imageUrl, imageSrcSet, productImage, productPath, slugify } from '../utils/format';

function StockStatus({ estoque }) {
  if (estoque <= 0) {
    return <p className="stock stock--out"><Icon name="alert" size={16} /> Esgotado no momento</p>;
  }
  if (estoque <= 3) {
    return <p className="stock stock--low"><Icon name="clock" size={16} /> Últimas {estoque} {estoque === 1 ? 'unidade' : 'unidades'}</p>;
  }
  return <p className="stock stock--in"><Icon name="checkCircle" size={16} /> Em estoque</p>;
}

function ProductSkeleton() {
  return (
    <div className="container product-page" aria-hidden="true">
      <div className="product-layout">
        <div className="skeleton skeleton--image product-gallery" />
        <div className="product-info">
          <div className="skeleton skeleton--text" style={{ width: '30%' }} />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" style={{ width: '25%', height: 28 }} />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text" style={{ width: '85%' }} />
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { items, addItem } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [produto, setProduto] = useState(null);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [relacionados, setRelacionados] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  usePageMeta(produto?.nome, produto?.descricao?.slice(0, 155));

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setQuantidade(1);
    getProduto(id, { signal: controller.signal })
      .then((data) => {
        setProduto(data);
        setStatus('success');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus(err?.response?.status === 404 || err?.response?.status === 400 ? 'notfound' : 'error');
        setErro(getErrorMessage(err, 'Não foi possível carregar o produto.'));
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  // URL canônica com o nome do produto (melhor para compartilhar e para buscadores)
  useEffect(() => {
    if (produto && slug !== slugify(produto.nome)) {
      navigate(productPath(produto), { replace: true });
    }
  }, [produto, slug, navigate]);

  useEffect(() => {
    if (!produto) return;
    getProdutos({ categoria: produto.categoria_id || 'todas', limit: 5 })
      .then((data) => setRelacionados((data.produtos || []).filter((p) => p.id !== produto.id).slice(0, 4)))
      .catch(() => setRelacionados([]));
  }, [produto]);

  if (status === 'loading') return <ProductSkeleton />;

  if (status === 'notfound' || status === 'error') {
    return (
      <div className="container page">
        <EmptyState
          icon={status === 'notfound' ? 'search' : 'alert'}
          tone={status === 'error' ? 'error' : 'default'}
          title={status === 'notfound' ? 'Produto não encontrado' : 'Não foi possível carregar o produto'}
          description={status === 'notfound' ? 'Ele pode ter sido removido da vitrine. Que tal ver outros presentes?' : erro}
        >
          {status === 'error' && (
            <button type="button" className="btn btn--primary" onClick={() => setReloadKey((k) => k + 1)}>
              <Icon name="refresh" size={18} /> Tentar novamente
            </button>
          )}
          <Link to="/" className="btn btn--secondary">Ver vitrine</Link>
        </EmptyState>
      </div>
    );
  }

  const estoque = Number(produto.estoque);
  const esgotado = estoque <= 0;
  const noCarrinho = items.find((i) => i.id === produto.id);
  const foto = productImage(produto);

  const adicionar = () => addItem(produto, quantidade);

  const comprarAgora = () => {
    const ok = noCarrinho || addItem(produto, quantidade, { silent: true });
    if (ok) navigate(user ? '/checkout' : '/auth?redirect=/checkout');
  };

  const compartilhar = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: produto.nome, text: `Olha esse presente: ${produto.nome}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link do produto copiado!', 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('Não foi possível compartilhar o link.', 'error');
    }
  };

  return (
    <div className="container product-page">
      <nav className="breadcrumbs" aria-label="Você está em">
        <Link to="/">Início</Link>
        <Icon name="chevronRight" size={14} />
        {produto.categoria_nome && (
          <>
            <Link to={`/?categoria=${produto.categoria_id}#catalogo`}>{produto.categoria_nome}</Link>
            <Icon name="chevronRight" size={14} />
          </>
        )}
        <span aria-current="page">{produto.nome}</span>
      </nav>

      <div className="product-layout">
        <div className="product-gallery">
          <img
            src={imageUrl(foto, 900)}
            srcSet={imageSrcSet(foto, 900)}
            alt={produto.nome}
            width="900"
            height="900"
          />
          {esgotado && <span className="badge badge--dark product-gallery__badge">Esgotado</span>}
        </div>

        <div className="product-info">
          {produto.categoria_nome && (
            <Link to={`/?categoria=${produto.categoria_id}#catalogo`} className="product-info__category">
              {produto.categoria_nome}
            </Link>
          )}
          <h1 className="product-info__title">{produto.nome}</h1>
          <p className="product-info__price">{formatPreco(produto.preco)}</p>
          <StockStatus estoque={estoque} />

          <div className="product-info__description">
            {produto.descricao || 'Um presente especial, escolhido com carinho para surpreender quem você ama.'}
          </div>

          {!esgotado && (
            <div className="product-buy">
              <div className="product-buy__qty">
                <span className="field__label">Quantidade</span>
                <QuantityStepper value={quantidade} onChange={setQuantidade} min={1} max={estoque} label="Quantidade" />
              </div>
              <div className="product-buy__actions">
                <button type="button" className="btn btn--primary btn--lg btn--block" onClick={adicionar}>
                  <Icon name="bag" size={20} /> Adicionar ao carrinho · {formatPreco(Number(produto.preco) * quantidade)}
                </button>
                <button type="button" className="btn btn--secondary btn--lg btn--block" onClick={comprarAgora}>
                  Comprar agora
                </button>
              </div>
              {noCarrinho && (
                <p className="product-buy__note">
                  <Icon name="check" size={16} /> Você já tem {noCarrinho.quantidade} no carrinho.
                </p>
              )}
            </div>
          )}

          {esgotado && (
            <a
              className="btn btn--secondary btn--lg btn--block"
              href={whatsappLink(`Olá! O produto "${produto.nome}" vai voltar ao estoque?`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon size={18} /> Avise-me pelo WhatsApp
            </a>
          )}

          <PickupInfo />

          <div className="product-info__links">
            <a href={whatsappLink(`Olá! Tenho uma dúvida sobre o produto "${produto.nome}".`)} target="_blank" rel="noopener noreferrer" className="link">
              <WhatsAppIcon size={16} /> Dúvidas sobre este produto?
            </a>
            <button type="button" className="link" onClick={compartilhar}>
              <Icon name="share" size={16} /> Compartilhar
            </button>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="section related" aria-labelledby="relacionados">
          <h2 id="relacionados" className="section-title section-title--sm">Você também pode gostar</h2>
          <div className="product-grid product-grid--compact">
            {relacionados.map((p) => <ProductCard key={p.id} produto={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
