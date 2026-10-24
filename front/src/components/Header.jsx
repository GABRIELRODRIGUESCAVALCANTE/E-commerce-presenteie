import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useCategorias } from '../hooks/useCategorias';
import { useDialog } from '../hooks/useDialog';
import { primeiroNome } from '../utils/format';

function SearchForm({ className = '', inputId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlBusca = location.pathname === '/' ? searchParams.get('busca') || '' : '';
  const [term, setTerm] = useState(urlBusca);
  const lastUrlBusca = useRef(urlBusca);

  // Mantém o campo sincronizado quando a busca muda pela URL (ex.: botão "limpar busca")
  if (lastUrlBusca.current !== urlBusca) {
    lastUrlBusca.current = urlBusca;
    if (term.trim() !== urlBusca) setTerm(urlBusca);
  }

  const goSearch = (value, { replace = false } = {}) => {
    const params = new URLSearchParams(window.location.pathname === '/' ? window.location.search : '');
    const clean = value.trim();
    if (clean) params.set('busca', clean);
    else params.delete('busca');
    const search = params.toString();
    navigate({ pathname: '/', search: search ? `?${search}` : '' }, { replace });
  };

  // Na vitrine a busca é aplicada enquanto o usuário digita (com pequeno atraso)
  useEffect(() => {
    if (location.pathname !== '/' || term.trim() === urlBusca) return;
    const timer = setTimeout(() => goSearch(term, { replace: true }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const handleSubmit = (e) => {
    e.preventDefault();
    goSearch(term);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <form role="search" className={`search ${className}`} onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="sr-only">Buscar presentes</label>
      <Icon name="search" size={18} className="search__icon" />
      <input
        id={inputId}
        type="search"
        className="search__input"
        placeholder="Buscar presentes..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
      {term && (
        <button type="button" className="search__clear" onClick={() => { setTerm(''); goSearch('', { replace: true }); }} aria-label="Limpar busca">
          <Icon name="x" size={16} />
        </button>
      )}
    </form>
  );
}

function AccountMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="header-action account-menu__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar" aria-hidden="true">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
        <span className="header-action__label">Olá, {primeiroNome(user.name) || 'Cliente'}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown__header">
            <p className="dropdown__name">{user.name}</p>
            <p className="dropdown__email">{user.email}</p>
          </div>
          <Link to="/meus-pedidos" className="dropdown__item"><Icon name="package" size={18} /> Meus pedidos</Link>
          {isAdmin && <Link to="/admin" className="dropdown__item"><Icon name="list" size={18} /> Painel administrativo</Link>}
          <button type="button" className="dropdown__item" onClick={onLogout}><Icon name="logout" size={18} /> Sair</button>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose, user, isAdmin, categorias, onLogout }) {
  const panelRef = useRef(null);
  useDialog(open, onClose, panelRef);

  return (
    <div className={`drawer drawer--left ${open ? 'drawer--open' : ''}`} inert={!open}>
      <div className="drawer__overlay" onClick={onClose} />
      <div ref={panelRef} className="drawer__panel" aria-label="Menu principal" role="dialog" aria-modal="true" tabIndex={-1}>
        <div className="drawer__header">
          <span className="logo logo--sm"><Icon name="gift" size={20} /> presenteie</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar menu">
            <Icon name="x" size={22} />
          </button>
        </div>
        <nav className="drawer__body" aria-label="Navegação principal">
          {user && (
            <div className="mobile-user">
              <span className="avatar avatar--lg" aria-hidden="true">{(user.name || 'U').charAt(0).toUpperCase()}</span>
              <div className="mobile-user__text">
                <p className="mobile-user__name">{user.name}</p>
                <p className="mobile-user__email">{user.email}</p>
              </div>
            </div>
          )}
          <ul className="mobile-nav">
            <li><NavLink to="/" end className="mobile-nav__link" onClick={onClose}><Icon name="store" size={20} /> Início</NavLink></li>
            <li><Link to="/#catalogo" className="mobile-nav__link" onClick={onClose}><Icon name="gift" size={20} /> Todos os presentes</Link></li>
            {user && <li><NavLink to="/meus-pedidos" className="mobile-nav__link" onClick={onClose}><Icon name="package" size={20} /> Meus pedidos</NavLink></li>}
            {isAdmin && <li><NavLink to="/admin" className="mobile-nav__link" onClick={onClose}><Icon name="list" size={20} /> Painel administrativo</NavLink></li>}
          </ul>
          {categorias.length > 0 && (
            <>
              <p className="mobile-nav__heading">Categorias</p>
              <ul className="mobile-nav mobile-nav--sub">
                {categorias.map((c) => (
                  <li key={c.id}>
                    <Link to={`/?categoria=${c.id}#catalogo`} className="mobile-nav__link" onClick={onClose}>{c.nome}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
        <div className="drawer__footer">
          {user ? (
            <button type="button" className="btn btn--secondary btn--block" onClick={() => { onClose(); onLogout(); }}>
              <Icon name="logout" size={18} /> Sair da conta
            </button>
          ) : (
            <Link to="/auth" className="btn btn--primary btn--block" onClick={onClose}>Entrar ou criar conta</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({ onLogout }) {
  const { user, isAdmin, isPending } = useAuth();
  const { count, openCart } = useCart();
  const categorias = useCategorias();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const categoriaAtiva = location.pathname === '/' ? searchParams.get('categoria') : null;

  // Fecha o menu móvel ao navegar (inclusive pelos botões voltar/avançar do navegador)
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  return (
    <>
      <aside className="announcement" aria-label="Avisos da loja">
        <div className="container announcement__inner">
          <span><Icon name="store" size={16} /> Retirada grátis no local</span>
          <span className="announcement__sep" aria-hidden="true">•</span>
          <span><Icon name="card" size={16} /> Pague na retirada: cartão, PIX ou dinheiro</span>
        </div>
      </aside>

      <header className="site-header">
        <div className="container site-header__inner">
          <button type="button" className="icon-btn site-header__menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            <Icon name="menu" size={24} />
          </button>

          <Link to="/" className="logo" aria-label="Presenteie — página inicial">
            <span className="logo__mark"><Icon name="gift" size={20} strokeWidth={2} /></span>
            <span className="logo__text">presenteie</span>
          </Link>

          <SearchForm className="site-header__search" inputId="busca-desktop" />

          <div className="site-header__actions">
            {!isPending && (user ? (
              <AccountMenu user={user} isAdmin={isAdmin} onLogout={onLogout} />
            ) : (
              <Link to="/auth" className="header-action">
                <Icon name="user" size={22} />
                <span className="header-action__label">Entrar</span>
              </Link>
            ))}
            <button type="button" className="header-action cart-button" onClick={openCart} aria-label={`Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}>
              <Icon name="bag" size={22} />
              <span className="header-action__label">Carrinho</span>
              {count > 0 && <span key={count} className="cart-button__badge">{count > 99 ? '99+' : count}</span>}
            </button>
          </div>
        </div>

        <div className="container site-header__search-mobile">
          <SearchForm inputId="busca-mobile" />
        </div>

        <nav className="site-nav" aria-label="Navegação da loja">
          <div className="container site-nav__inner">
            <ul className="site-nav__list">
              <li><NavLink to="/" end className={() => `site-nav__link ${location.pathname === '/' && !categoriaAtiva ? 'is-active' : ''}`}>Início</NavLink></li>
              {categorias.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link to={`/?categoria=${c.id}#catalogo`} className={`site-nav__link ${categoriaAtiva === String(c.id) ? 'is-active' : ''}`}>{c.nome}</Link>
                </li>
              ))}
            </ul>
            <ul className="site-nav__list">
              {user && <li><NavLink to="/meus-pedidos" className="site-nav__link">Meus pedidos</NavLink></li>}
              {isAdmin && <li><NavLink to="/admin" className="site-nav__link">Painel admin</NavLink></li>}
            </ul>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        isAdmin={isAdmin}
        categorias={categorias}
        onLogout={onLogout}
      />
    </>
  );
}
