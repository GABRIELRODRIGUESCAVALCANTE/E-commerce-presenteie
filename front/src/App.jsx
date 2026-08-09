import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';
import { authClient } from './auth';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { ToastProvider, useToast } from './context/ToastContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ProductModal from './components/ProductModal';
import { ProductSkeletonGrid, OrderSkeletonList, Spinner } from './components/Skeleton';
import { formatPreco, STATUS_LABELS, STATUS_OPTIONS, PLACEHOLDER_IMG } from './utils/format';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
axios.defaults.withCredentials = true;

// ==========================================
// TELA DE LOGIN / CADASTRO
// ==========================================
const Autenticacao = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const { error } = await authClient.signIn.email({ email, password: senha });
        if (error) throw error;
        showToast('Login realizado com sucesso!', 'success');
        navigate('/');
      } else {
        const { error } = await authClient.signUp.email({ email, password: senha, name: nome });
        if (error) throw error;
        showToast('Conta criada! Bem-vindo à Presenteie.', 'success');
        navigate('/');
      }
    } catch (erro) {
      showToast(erro.message || 'Erro na autenticação.', 'error');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin, // Usa a URL atual do frontend (localhost:5173) ao invés do backend
      });
    } catch (erro) {
      showToast(erro.message || 'Erro ao entrar com Google.', 'error');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Entrar na Conta' : 'Criar Conta'}</h2>
      <p className="auth-subtitle">
        {isLogin ? 'Acesse sua conta para acompanhar pedidos' : 'Cadastre-se e comece a presentear'}
      </p>

      <button type="button" onClick={handleGoogleLogin} className="btn btn-google btn-block">
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Entrar com o Google
      </button>

      <div className="auth-divider">
        <span>ou use seu e-mail</span>
      </div>

      <form onSubmit={handleSubmit} className="form-box">
        {!isLogin && (
          <input type="text" placeholder="Seu Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        )}
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <button type="submit" className="btn btn-primary btn-block">
          {isLogin ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
      <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? (
          <>Ainda não tem conta? <span>Cadastre-se</span></>
        ) : (
          <>Já tem conta? <span>Entre aqui</span></>
        )}
      </p>
    </div>
  );
};

// ==========================================
// TELA DA VITRINE
// ==========================================
const Vitrine = ({ adicionarAoCarrinho }) => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [page, setPage] = useState(1);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    // Busca inicial de categorias
    axios.get(`${API}/categorias`)
      .then((res) => setCategorias(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1); // Reseta a página ao mudar filtros

    const delay = setTimeout(() => {
      axios.get(`${API}/produtos?page=1&limit=12&busca=${busca}&categoria=${categoriaAtiva}`)
        .then((resProdutos) => {
          setProdutos(resProdutos.data.produtos);
          setTotalProdutos(resProdutos.data.totalCount);
        })
        .catch(() => showToast('Erro ao carregar produtos.', 'error'))
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(delay);
  }, [busca, categoriaAtiva, showToast]);

  const carregarMais = () => {
    setLoadingMais(true);
    const proximaPagina = page + 1;
    axios.get(`${API}/produtos?page=${proximaPagina}&limit=12&busca=${busca}&categoria=${categoriaAtiva}`)
      .then((res) => {
        setProdutos((prev) => [...prev, ...res.data.produtos]);
        setPage(proximaPagina);
      })
      .catch(() => showToast('Erro ao carregar mais produtos.', 'error'))
      .finally(() => setLoadingMais(false));
  };

  const handleQuickAdd = (e, produto) => {
    e.stopPropagation();
    adicionarAoCarrinho(produto, 1);
  };

  return (
    <div>
      <section className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">Surpreenda quem você ama</h1>
          <p className="hero-subtitle">Descubra presentes inesquecíveis, selecionados a dedo para tornar cada momento especial. Embalagem premium.</p>
          <a href="#catalogo" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>Explorar Presentes</a>
        </div>
      </section>

      <section id="catalogo" className="section-container" style={{ paddingTop: '2rem' }}>
        <h2 className="section-title">Coleção Exclusiva</h2>
        <p className="section-subtitle">Nossos produtos mais amados</p>

        <div className="vitrine-toolbar">
          <div className="search-box">
            <input
              type="search"
              placeholder="Buscar presentes..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <ProductSkeletonGrid />
        ) : produtos.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p>Nenhum presente encontrado.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setBusca('')}>
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid-produtos">
            {produtos.map((produto, index) => {
              const imagem = produto.imagem_url || produto.imagem || PLACEHOLDER_IMG;
              const isNovo = index < 2;
              const isEsgotado = produto.estoque === 0;

              return (
                <div key={produto.id} className="card-produto" onClick={() => setProdutoSelecionado(produto)}>
                  <div className="card-produto-image-wrap">
                    <img src={imagem} alt={produto.nome} className="card-produto-image" loading="lazy" />
                    <div className="card-produto-tags">
                      {isNovo && <span className="tag" style={{ background: 'var(--color-primary)', color: 'white' }}>Novo</span>}
                      {isEsgotado && <span className="tag" style={{ background: 'var(--color-text)', color: 'white' }}>Esgotado</span>}
                    </div>
                    {!isEsgotado && (
                      <div className="card-overlay-action">
                        <button type="button" className="btn-add-overlay" onClick={(e) => handleQuickAdd(e, produto)}>
                          Adicionar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="card-produto-body">
                    <div className="stars"></div>
                    <h3>{produto.nome}</h3>
                    <p className="preco">{formatPreco(produto.preco)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && produtos.length > 0 && produtos.length < totalProdutos && (
          <div style={{ textAlign: 'center', margin: '4rem 0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={carregarMais}
              disabled={loadingMais}
            >
              {loadingMais ? 'Carregando...' : 'Carregar Mais Presentes ↓'}
            </button>
          </div>
        )}
      </section>

      <section className="testimonials-section section-container" style={{ margin: '4rem auto 0' }}>
        <h2 className="section-title">O que dizem nossos clientes</h2>
        <p className="section-subtitle">Milhares de momentos inesquecíveis criados.</p>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-text">"O presente chegou impecável, a embalagem é simplesmente maravilhosa. Minha mãe chorou de emoção!"</p>
            <p className="testimonial-author">Amanda Silva</p>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"Comprei o kit de aniversário e a qualidade superou todas as expectativas. Recomendo de olhos fechados."</p>
            <p className="testimonial-author">Ricardo Gomes</p>
          </div>

        </div>
      </section>

      {produtoSelecionado && (
        <ProductModal
          produto={produtoSelecionado}
          onClose={() => setProdutoSelecionado(null)}
          onAddToCart={adicionarAoCarrinho}
        />
      )}
    </div>
  );
};

// ==========================================
// TELA DO CARRINHO (página dedicada)
// ==========================================
const Carrinho = ({ carrinho, atualizarQuantidade, removerDoCarrinho }) => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { showToast } = useToast();

  const valorTotal = carrinho.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);

  const irParaCheckout = () => {
    if (!session) {
      showToast('Faça login para finalizar a compra.', 'warning');
      navigate('/auth');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="carrinho-container">
      <div className="page-header">
        <h2>Seu Carrinho </h2>
        <p>Revise seus presentes antes de finalizar</p>
      </div>

      {carrinho.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <p>Seu carrinho está vazio. Que tal encontrar um presente especial?</p>
          <Link to="/" className="btn btn-primary">Explorar Vitrine</Link>
        </div>
      ) : (
        <>
          <div className="carrinho-lista">
            {carrinho.map((item) => (
              <div key={item.id} className="carrinho-item">
                <img
                  src={item.imagem_url || item.imagem || PLACEHOLDER_IMG}
                  alt={item.nome}
                  className="carrinho-item-thumb"
                />
                <div className="carrinho-info">
                  <h4>{item.nome}</h4>
                  <p>{formatPreco(item.preco)} cada</p>
                  <div className="qty-controls qty-controls--sm">
                    <button type="button" className="qty-btn" onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}>−</button>
                    <span className="qty-value">{item.quantidade}</span>
                    <button type="button" className="qty-btn" onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}>+</button>
                  </div>
                </div>
                <p className="carrinho-subtotal">{formatPreco(Number(item.preco) * item.quantidade)}</p>
                <button type="button" className="btn-remover" onClick={() => removerDoCarrinho(item.id)} aria-label="Remover">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="carrinho-total">
            <h3>Total: {formatPreco(valorTotal)}</h3>
            <button type="button" className="btn-finalizar" onClick={irParaCheckout}>
              Ir para o Pagamento
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// TELA DE CHECKOUT
// ==========================================
const Checkout = ({ carrinho, limparCarrinho }) => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { showToast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [dadosEntrega, setDadosEntrega] = useState({ nomeCompleto: '', telefone: '' });
  const [metodoPagamento, setMetodoPagamento] = useState('cartão');

  const valorTotal = carrinho.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);

  useEffect(() => {
    if (session) {
      setDadosEntrega((d) => ({ ...d, nomeCompleto: session.user.name }));
    }
  }, [session]);

  useEffect(() => {
    if (carrinho.length === 0) navigate('/');
  }, [carrinho, navigate]);

  const processarPedido = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
      showToast('Faça login para finalizar a compra.', 'warning');
      navigate('/auth');
      return;
    }
    setEnviando(true);
    try {
      const response = await axios.post(`${API}/pedidos`, {
        usuario_id: session.user.id,
        nome_cliente: dadosEntrega.nomeCompleto,
        telefone: dadosEntrega.telefone,
        metodo_entrega: 'retirada',
        metodo_pagamento: metodoPagamento,
        email_cliente: session.user.email,
        endereco: 'Retirada no Local',
        cidade: 'Retirada no Local',
        cep: '00000-000',
        total: valorTotal,
        itens: carrinho,
      });
      showToast(`Pedido #${response.data.pedidoId} confirmado! Obrigado, ${dadosEntrega.nomeCompleto.split(' ')[0]}!`, 'success');
      limparCarrinho();
      navigate('/meus-pedidos');
    } catch {
      showToast('Erro ao processar pedido. Tente novamente.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="page-header">
        <h2>Finalizar Compra </h2>
        <p>Preencha os dados para concluir</p>
      </div>
      <div className="checkout-grid">
        <div className="checkout-form">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary-dark)' }}> Retirada no Local</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            No momento, estamos trabalhando exclusivamente com retirada no local.
          </p>

          <h3>Forma de Pagamento (na retirada)</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button type="button" className={`btn ${metodoPagamento === 'cartão' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMetodoPagamento('cartão')} style={{ flex: 1, minWidth: '100px' }}> Cartão</button>
            <button type="button" className={`btn ${metodoPagamento === 'pix' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMetodoPagamento('pix')} style={{ flex: 1, minWidth: '100px' }}> PIX</button>
            <button type="button" className={`btn ${metodoPagamento === 'espécie' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMetodoPagamento('espécie')} style={{ flex: 1, minWidth: '100px' }}> Espécie</button>
          </div>

          <h3>Dados do Contato</h3>
          <form onSubmit={processarPedido} className="form-box">
            <input type="text" placeholder="Nome Completo" value={dadosEntrega.nomeCompleto} onChange={(e) => setDadosEntrega({ ...dadosEntrega, nomeCompleto: e.target.value })} required />
            <input type="tel" placeholder="Telefone / WhatsApp" value={dadosEntrega.telefone} onChange={(e) => setDadosEntrega({ ...dadosEntrega, telefone: e.target.value })} required />

            <button type="submit" className="btn btn-primary btn-block btn-confirmar-pedido" disabled={enviando} style={{ marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}>
              {enviando ? 'Processando...' : 'Confirmar Pedido'}
            </button>
          </form>
        </div>
        <div className="checkout-resumo">
          <h3>Resumo</h3>
          <div className="resumo-itens">
            {carrinho.map((item) => (
              <div key={item.id} className="resumo-item">
                <span>{item.quantidade}x {item.nome}</span>
                <span>{formatPreco(Number(item.preco) * item.quantidade)}</span>
              </div>
            ))}
          </div>
          <div className="resumo-total">
            <span>Total</span>
            <span>{formatPreco(valorTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TELA ADMINISTRATIVA
// ==========================================
const Admin = () => {
  const [abaAtiva, setAbaAtiva] = useState('pedidos');
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState(10);
  const [imagemFile, setImagemFile] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (abaAtiva === 'pedidos') carregarPedidos();
    if (abaAtiva === 'estoque') carregarProdutosAdmin();
  }, [abaAtiva]);

  const carregarProdutosAdmin = async () => {
    setLoadingProdutos(true);
    try {
      const res = await axios.get(`${API}/produtos?admin=true&limit=100`);
      setProdutos(res.data.produtos);
    } catch {
      showToast('Erro ao carregar produtos.', 'error');
    } finally {
      setLoadingProdutos(false);
    }
  };

  const excluirProduto = async (id) => {
    try {
      await axios.delete(`${API}/produtos/${id}`);
      setProdutos(prev => prev.filter(p => p.id !== id));
      showToast('Produto excluído com sucesso!', 'success');
      setProdutoParaExcluir(null);
    } catch {
      showToast('Erro ao excluir produto.', 'error');
    }
  };

  const carregarPedidos = async () => {
    setLoadingPedidos(true);
    try {
      const response = await axios.get(`${API}/pedidos`);
      setPedidos(response.data);
    } catch {
      showToast('Erro ao carregar pedidos.', 'error');
    } finally {
      setLoadingPedidos(false);
    }
  };

  const atualizarStatus = async (pedidoId, novoStatus) => {
    try {
      await axios.patch(`${API}/pedidos/${pedidoId}/status`, { status: novoStatus });
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
      );
      showToast(`Pedido #${pedidoId} → ${STATUS_LABELS[novoStatus]}`, 'success');
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const cadastrarProduto = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('preco', preco);
      formData.append('descricao', descricao);
      formData.append('estoque', estoque);
      formData.append('categoria_id', '');
      if (imagemFile) {
        formData.append('imagem', imagemFile);
      }

      await axios.post(`${API}/produtos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Produto cadastrado com sucesso!', 'success');
      setNome(''); setPreco(''); setEstoque(10); setImagemFile(null); setDescricao('');
      const fileInput = document.getElementById('imagem_upload');
      if (fileInput) fileInput.value = '';
    } catch {
      showToast('Erro ao cadastrar produto.', 'error');
    }
  };

  return (
    <div className="admin-container">
      <div className="page-header">
        <h2>Painel Administrativo </h2>
        <p>Gerencie pedidos e produtos da loja</p>
      </div>

      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${abaAtiva === 'pedidos' ? 'admin-tab--active' : ''}`} onClick={() => setAbaAtiva('pedidos')}>
          Ver Pedidos
        </button>
        <button type="button" className={`admin-tab ${abaAtiva === 'estoque' ? 'admin-tab--active' : ''}`} onClick={() => setAbaAtiva('estoque')}>
          Gerenciar Estoque
        </button>
        <button type="button" className={`admin-tab ${abaAtiva === 'produtos' ? 'admin-tab--active' : ''}`} onClick={() => setAbaAtiva('produtos')}>
          Cadastrar Produto
        </button>
      </div>

      {abaAtiva === 'pedidos' && (
        <div>
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Histórico de Vendas</h3>
          {loadingPedidos ? (
            <OrderSkeletonList />
          ) : pedidos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <p>Nenhum pedido recebido ainda.</p>
            </div>
          ) : (
            <div className="pedidos-list">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="pedido-card">
                  <div className="pedido-card-header">
                    <div>
                      <h4>Pedido #{pedido.id}</h4>
                      <p className="pedido-date">{pedido.data_formatada}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge status-badge--${pedido.status}`}>
                        {STATUS_LABELS[pedido.status] || pedido.status}
                      </span>
                      <p className="pedido-total">{formatPreco(pedido.total)}</p>
                    </div>
                  </div>
                  <p><strong>Cliente:</strong> {pedido.nome_cliente} <span style={{ color: 'var(--color-primary)', marginLeft: '0.5rem' }}> {pedido.telefone || 'N/A'}</span></p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', lineHeight: '1.5' }}>
                    <strong>{pedido.metodo_entrega === 'retirada' ? ' Retirada no Local' : ' Entrega'}:</strong> {pedido.metodo_entrega === 'entrega' ? `${pedido.endereco} — ${pedido.cidade} (CEP: ${pedido.cep})` : ''}
                    <br />
                    <strong> Pagamento:</strong> {pedido.metodo_pagamento ? pedido.metodo_pagamento.toUpperCase() : 'N/A'}
                  </p>
                  <strong style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.9rem' }}>Itens:</strong>
                  <ul className="pedido-itens">
                    {pedido.itens.map((item, index) => (
                      <li key={index}>{item.quantidade}x {item.nome} — {formatPreco(item.preco_unitario)}</li>
                    ))}
                  </ul>
                  <div className="status-actions">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`status-btn ${pedido.status === opt.value ? 'status-btn--active' : ''}`}
                        onClick={() => atualizarStatus(pedido.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'produtos' && (
        <div>
          <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Novo Produto</h3>
          <form onSubmit={cadastrarProduto} className="form-box" style={{ maxWidth: '480px' }}>
            <input type="text" placeholder="Nome do Produto" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <input type="number" step="0.01" placeholder="Preço (Ex: 99.90)" value={preco} onChange={(e) => setPreco(e.target.value)} required />
            <input type="number" placeholder="Estoque Inicial" value={estoque} onChange={(e) => setEstoque(e.target.value)} required min="0" />
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Imagem do Produto</label>
            <input id="imagem_upload" type="file" accept="image/*" onChange={(e) => setImagemFile(e.target.files[0])} required />
            <textarea placeholder="Descrição do produto" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} />
            <button type="submit" className="btn btn-primary">Cadastrar Produto</button>
          </form>
        </div>
      )}

      {abaAtiva === 'estoque' && (
        <div>
          <h3 style={{ fontWeight: 800, marginBottom: '1rem' }}>Controle de Estoque</h3>
          {loadingProdutos ? (
            <p>Carregando produtos...</p>
          ) : (
            <div className="pedidos-list">
              {produtos.map(p => (
                <div key={p.id} className="pedido-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{p.nome}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Preço: {formatPreco(p.preco)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold' }}>Estoque:</label>
                    <input
                      type="number"
                      defaultValue={p.estoque}
                      min="0"
                      style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                      onBlur={async (e) => {
                        const novoEstoque = parseInt(e.target.value);
                        if (novoEstoque !== p.estoque && !isNaN(novoEstoque)) {
                          try {
                            await axios.patch(`${API}/produtos/${p.id}/estoque`, { estoque: novoEstoque });
                            showToast(`Estoque do ${p.nome} atualizado!`, 'success');
                          } catch {
                            showToast(`Erro ao atualizar ${p.nome}`, 'error');
                          }
                        }
                      }}
                    />
                    <button
                      className="btn btn-ghost"
                      style={{ color: '#dc3545', padding: '0.5rem', marginLeft: '0.5rem' }}
                      onClick={() => setProdutoParaExcluir(p)}
                      title="Excluir produto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {produtoParaExcluir && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Excluir Produto?</h3>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
              Tem certeza que deseja excluir o produto <strong>{produtoParaExcluir.nome}</strong>? Esta ação removerá o produto do banco de dados definitivamente.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setProdutoParaExcluir(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                onClick={() => excluirProduto(produtoParaExcluir.id)}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// TELA "MEUS PEDIDOS"
// ==========================================
const MeusPedidos = () => {
  const { data: session } = authClient.useSession();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      axios.get(`${API}/meus-pedidos/${session.user.id}`)
        .then((res) => setPedidos(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (!session) {
    return (
      <div className="pedidos-page">
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <p>Faça login para ver seus pedidos.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/auth')}>Entrar</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="pedidos-page"><Spinner label="Carregando seus pedidos..." /></div>;

  return (
    <div className="pedidos-page">
      <div className="page-header">
        <h2>Meus Pedidos </h2>
        <p>Acompanhe o andamento das suas compras</p>
      </div>
      {pedidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <p>Você ainda não realizou nenhuma compra.</p>
          <Link to="/" className="btn btn-primary">Ir para a Vitrine</Link>
        </div>
      ) : (
        <div className="pedidos-list">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="pedido-card">
              <div className="pedido-card-header">
                <div>
                  <h4>Pedido #{pedido.id}</h4>
                  <p className="pedido-date">{pedido.data_formatada}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`status-badge status-badge--${pedido.status}`}>
                    {STATUS_LABELS[pedido.status] || pedido.status}
                  </span>
                  <p className="pedido-total">{formatPreco(pedido.total)}</p>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                <strong>Entrega:</strong> {pedido.endereco}, {pedido.cidade} — CEP: {pedido.cep}
              </p>
              <ul className="pedido-itens" style={{ marginTop: '0.75rem' }}>
                {pedido.itens.map((item, idx) => (
                  <li key={idx}>{item.quantidade}x {item.nome} — {formatPreco(item.preco_unitario)} cada</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// ROTA PROTEGIDA
// ==========================================
const RotaProtegida = ({ children, session, isPending }) => {
  const emailAdmin = import.meta.env.VITE_ADMIN_EMAIL || 'teste@gmail.com';

  if (isPending) return <Spinner label="Verificando credenciais..." />;
  if (!session) return <Navigate to="/auth" />;
  if (session.user.email !== emailAdmin) return <Navigate to="/" replace />;
  return children;
};

// ==========================================
// APP PRINCIPAL
// ==========================================
function AppContent() {
  const { data: session, isPending } = authClient.useSession();
  const { showToast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [carrinho, setCarrinho] = useState(() => {
    const saved = localStorage.getItem('carrinhoPresenteie');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('carrinhoPresenteie', JSON.stringify(carrinho));
  }, [carrinho]);

  const adicionarAoCarrinho = (produto, quantidade = 1) => {
    setCarrinho((prev) => {
      const existente = prev.find((item) => item.id === produto.id);
      const qtdAtual = existente ? existente.quantidade : 0;

      if (qtdAtual + quantidade > produto.estoque) {
        showToast(`Temos apenas ${produto.estoque} unidades disponíveis!`, 'warning');
        return prev;
      }

      if (existente) {
        showToast(`"${produto.nome}" adicionado ao carrinho!`, 'success');
        return prev.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + quantidade } : item
        );
      }
      showToast(`"${produto.nome}" adicionado ao carrinho!`, 'success');
      return [...prev, { ...produto, quantidade }];
    });
  };

  const atualizarQuantidade = (id, novaQtd) => {
    if (novaQtd <= 0) {
      setCarrinho((prev) => prev.filter((item) => item.id !== id));
      showToast('Item removido do carrinho.', 'info');
      return;
    }
    setCarrinho((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (novaQtd > item.estoque) {
            showToast(`Limite de estoque atingido (${item.estoque} disponíveis).`, 'warning');
            return item;
          }
          return { ...item, quantidade: novaQtd };
        }
        return item;
      })
    );
  };

  const removerDoCarrinho = (id) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== id));
    showToast('Item removido do carrinho.', 'info');
  };

  const limparCarrinho = () => setCarrinho([]);

  const quantidadeItensCarrinho = carrinho.reduce((t, item) => t + item.quantidade, 0);

  const handleLogout = async () => {
    await authClient.signOut();
    setCarrinho([]); // Limpa o estado
    localStorage.removeItem('carrinhoPresenteie'); // Limpa do navegador
    showToast('Até logo! Volte sempre.', 'info');
    window.location.reload();
  };

  return (
    <Router>
      <Header
        session={session}
        quantidadeItensCarrinho={quantidadeItensCarrinho}
        onOpenCart={() => setCartOpen(true)}
        onLogout={handleLogout}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        carrinho={carrinho}
        atualizarQuantidade={atualizarQuantidade}
        removerDoCarrinho={removerDoCarrinho}
      />

      <main>
        <Routes>
          <Route path="/" element={<Vitrine adicionarAoCarrinho={adicionarAoCarrinho} />} />
          <Route path="/carrinho" element={<Carrinho carrinho={carrinho} atualizarQuantidade={atualizarQuantidade} removerDoCarrinho={removerDoCarrinho} />} />
          <Route path="/checkout" element={<Checkout carrinho={carrinho} limparCarrinho={limparCarrinho} />} />
          <Route path="/auth" element={<Autenticacao />} />
          <Route path="/meus-pedidos" element={<MeusPedidos />} />
          <Route path="/admin" element={<RotaProtegida session={session} isPending={isPending}><Admin /></RotaProtegida>} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
