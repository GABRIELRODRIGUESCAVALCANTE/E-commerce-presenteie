import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon, { WhatsAppIcon } from '../components/Icon';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { Select } from '../components/Field';
import { ProductSkeletonGrid } from '../components/Skeleton';
import { getProdutos } from '../api';
import { getErrorMessage } from '../api/client';
import { useCategorias } from '../hooks/useCategorias';
import { usePageMeta } from '../hooks/usePageMeta';
import { useToast } from '../hooks/useToast';
import { whatsappLink } from '../config/store';
import { imageUrl, productImage, productPath } from '../utils/format';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'menor_preco', label: 'Menor preço' },
  { value: 'maior_preco', label: 'Maior preço' },
  { value: 'nome', label: 'Nome (A–Z)' },
];

const BENEFITS = [
  { icon: 'store', title: 'Retirada no local', text: 'Sem custo de frete' },
  { icon: 'card', title: 'Pague na retirada', text: 'Cartão, PIX ou dinheiro' },
  { icon: 'gift', title: 'Embalagem caprichada', text: 'Pronto para presentear' },
  { icon: 'whatsapp', title: 'Atendimento próximo', text: 'Tire dúvidas pelo WhatsApp' },
];

const STEPS = [
  { icon: 'search', title: 'Escolha o presente', text: 'Navegue pela vitrine e adicione seus favoritos ao carrinho.' },
  { icon: 'checkCircle', title: 'Confirme o pedido', text: 'Finalize online em poucos passos, sem pagar nada agora.' },
  { icon: 'store', title: 'Retire e pague', text: 'Busque no local e pague com cartão, PIX ou dinheiro.' },
];

const TESTIMONIALS = [
  { text: 'O presente chegou impecável, a embalagem é simplesmente maravilhosa. Minha mãe chorou de emoção!', author: 'Amanda Silva' },
  { text: 'Comprei o kit de aniversário e a qualidade superou todas as expectativas. Recomendo de olhos fechados.', author: 'Ricardo Gomes' },
];

function Hero({ destaques }) {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__content">
          <p className="eyebrow"><Icon name="sparkles" size={16} /> Presentes selecionados a dedo</p>
          <h1 className="hero__title">Surpreenda quem você ama</h1>
          <p className="hero__subtitle">
            Descubra presentes inesquecíveis, selecionados a dedo para tornar cada momento especial. Embalagem premium.
          </p>
          <div className="hero__actions">
            <a href="#catalogo" className="btn btn--primary btn--lg">
              Explorar presentes <Icon name="arrowRight" size={18} />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn--secondary btn--lg">
              <WhatsAppIcon size={18} /> Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className={`hero__visual hero__visual--${Math.max(destaques.length, 1)}`} aria-hidden="true">
          {destaques.length === 0 ? (
            <div className="hero__placeholder"><Icon name="gift" size={72} strokeWidth={1.2} /></div>
          ) : (
            destaques.map((p, i) => (
              <Link key={p.id} to={productPath(p)} className={`hero__tile hero__tile--${i + 1}`} tabIndex={-1}>
                <img src={imageUrl(productImage(p), i === 0 ? 720 : 400)} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="benefits" aria-label="Vantagens de comprar na Presenteie">
      <ul className="container benefits__list">
        {BENEFITS.map((b) => (
          <li key={b.title} className="benefit">
            <span className="benefit__icon">
              {b.icon === 'whatsapp' ? <WhatsAppIcon size={20} /> : <Icon name={b.icon} size={20} />}
            </span>
            <div>
              <p className="benefit__title">{b.title}</p>
              <p className="benefit__text">{b.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const busca = searchParams.get('busca') || '';
  const categoria = searchParams.get('categoria') || 'todas';
  const ordem = SORT_OPTIONS.some((o) => o.value === searchParams.get('ordem')) ? searchParams.get('ordem') : 'recentes';
  const filtrando = Boolean(busca) || categoria !== 'todas';

  const categorias = useCategorias();
  const { showToast } = useToast();
  const categoriaAtual = categorias.find((c) => String(c.id) === categoria);

  const [produtos, setProdutos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [destaques, setDestaques] = useState([]);

  usePageMeta(busca ? `Busca: ${busca}` : categoriaAtual?.nome);

  // Produtos mais recentes para a vitrine do topo (carregado uma única vez)
  useEffect(() => {
    getProdutos({ limit: 8 })
      .then((data) => {
        const lista = data.produtos || [];
        const comFoto = lista.filter((p) => productImage(p));
        setDestaques((comFoto.length ? comFoto : lista).slice(0, 3));
      })
      .catch(() => setDestaques([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    getProdutos(
      { page: 1, limit: PAGE_SIZE, busca: busca || undefined, categoria, ordem },
      { signal: controller.signal }
    )
      .then((data) => {
        setProdutos(data.produtos || []);
        setTotal(data.totalCount || 0);
        setPage(1);
        setStatus('success');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErro(getErrorMessage(err, 'Não foi possível carregar os produtos.'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [busca, categoria, ordem, reloadKey]);

  const carregarMais = async () => {
    setLoadingMore(true);
    try {
      const data = await getProdutos({ page: page + 1, limit: PAGE_SIZE, busca: busca || undefined, categoria, ordem });
      setProdutos((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...(data.produtos || []).filter((p) => !ids.has(p.id))];
      });
      setPage((p) => p + 1);
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível carregar mais produtos.'), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Lê a URL atual (e não a da última renderização) para não perder filtros em cliques rápidos
  const updateParam = useCallback((key, value, defaultValue) => {
    const next = new URLSearchParams(window.location.search);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }, [setSearchParams]);

  const limparFiltros = () => setSearchParams(ordem !== 'recentes' ? { ordem } : {});

  const titulo = busca ? `Resultados para “${busca}”` : categoriaAtual ? categoriaAtual.nome : 'Nossos presentes';

  return (
    <>
      {!filtrando && (
        <>
          <Hero destaques={destaques} />
          <Benefits />
        </>
      )}

      <section id="catalogo" className="section catalog" aria-labelledby="catalogo-titulo">
        <div className="container">
          <div className="section-header section-header--row">
            <div>
              {filtrando && (
                <nav className="breadcrumbs" aria-label="Você está em">
                  <Link to="/">Início</Link>
                  <Icon name="chevronRight" size={14} />
                  <span aria-current="page">{busca ? 'Busca' : categoriaAtual?.nome || 'Categoria'}</span>
                </nav>
              )}
              <h2 id="catalogo-titulo" className="section-title">{titulo}</h2>
              <p className="section-subtitle" aria-live="polite">
                {status === 'success'
                  ? `${total} ${total === 1 ? 'presente encontrado' : 'presentes encontrados'}`
                  : filtrando ? 'Buscando presentes...' : 'Nossos produtos mais amados'}
              </p>
            </div>
            <div className="catalog__sort">
              <label htmlFor="ordenar" className="catalog__sort-label">Ordenar por</label>
              <Select id="ordenar" value={ordem} onChange={(e) => updateParam('ordem', e.target.value, 'recentes')}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>

          {(categorias.length > 0 || busca) && (
            <div className="chips" role="group" aria-label="Filtrar por categoria">
              <button
                type="button"
                className={`chip ${categoria === 'todas' ? 'chip--active' : ''}`}
                aria-pressed={categoria === 'todas'}
                onClick={() => updateParam('categoria', null)}
              >
                Todos
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip ${categoria === String(c.id) ? 'chip--active' : ''}`}
                  aria-pressed={categoria === String(c.id)}
                  onClick={() => updateParam('categoria', String(c.id))}
                >
                  {c.nome}
                </button>
              ))}
              {busca && (
                <button type="button" className="chip chip--removable" onClick={() => updateParam('busca', null)} aria-label={`Remover busca por ${busca}`}>
                  Busca: {busca} <Icon name="x" size={14} />
                </button>
              )}
            </div>
          )}

          {status === 'loading' ? (
            <ProductSkeletonGrid />
          ) : status === 'error' ? (
            <EmptyState icon="alert" tone="error" title="Não foi possível carregar os presentes" description={erro}>
              <button type="button" className="btn btn--primary" onClick={() => setReloadKey((k) => k + 1)}>
                <Icon name="refresh" size={18} /> Tentar novamente
              </button>
            </EmptyState>
          ) : produtos.length === 0 ? (
            <EmptyState
              icon="search"
              title={filtrando ? 'Nenhum presente encontrado' : 'Em breve, novidades por aqui'}
              description={filtrando ? 'Tente outro termo de busca ou veja todos os presentes disponíveis.' : 'Ainda não há produtos disponíveis na vitrine. Volte em breve!'}
            >
              {filtrando && (
                <button type="button" className="btn btn--secondary" onClick={limparFiltros}>Ver todos os presentes</button>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="product-grid">
                {produtos.map((produto, index) => (
                  <ProductCard
                    key={produto.id}
                    produto={produto}
                    isNew={!filtrando && ordem === 'recentes' && index < 2}
                    priority={index < 4}
                  />
                ))}
              </div>

              {produtos.length < total && (
                <div className="catalog__more">
                  <p className="muted">Mostrando {produtos.length} de {total} presentes</p>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${(produtos.length / total) * 100}%` }} />
                  </div>
                  <button type="button" className="btn btn--secondary" onClick={carregarMais} disabled={loadingMore}>
                    {loadingMore ? 'Carregando...' : 'Carregar mais presentes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {!filtrando && (
        <>
          <section className="section section--tinted" aria-labelledby="como-funciona">
            <div className="container">
              <div className="section-header section-header--center">
                <h2 id="como-funciona" className="section-title">Como funciona</h2>
                <p className="section-subtitle">Comprar na Presenteie é simples e sem surpresas</p>
              </div>
              <ol className="steps">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="step">
                    <span className="step__number" aria-hidden="true">{i + 1}</span>
                    <span className="step__icon"><Icon name={step.icon} size={22} /></span>
                    <h3 className="step__title">{step.title}</h3>
                    <p className="step__text">{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="section" aria-labelledby="depoimentos">
            <div className="container">
              <div className="section-header section-header--center">
                <h2 id="depoimentos" className="section-title">O que dizem nossos clientes</h2>
                <p className="section-subtitle">Milhares de momentos inesquecíveis criados.</p>
              </div>
              <div className="testimonials">
                {TESTIMONIALS.map((t) => (
                  <figure key={t.author} className="testimonial">
                    <span className="testimonial__quote" aria-hidden="true">“</span>
                    <blockquote>{t.text}</blockquote>
                    <figcaption>{t.author}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
