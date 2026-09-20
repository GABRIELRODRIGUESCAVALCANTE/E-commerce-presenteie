import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header({
  session,
  quantidadeItensCarrinho,
  onOpenCart,
  onLogout,
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  // Fecha o menu móvel automaticamente ao mudar de rota
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isAdmin = Boolean(
    session &&
    import.meta.env.VITE_ADMIN_EMAIL &&
    session.user?.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL.toLowerCase()
  );

  return (
    <header className="header glassmorphism">
      <div className="header-inner">
        <Link to="/" className="header-logo" onClick={() => setMenuAberto(false)}>
          <span className="logo-icon">🎁</span>
          <span className="logo-text">presenteie</span>
        </Link>

        {/* Navegação Desktop */}
        <nav className="header-nav">
          <Link to="/" className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}>
            Vitrine
          </Link>
          {session && (
            <Link to="/meus-pedidos" className={`nav-link ${isActive('/meus-pedidos') ? 'nav-link--active' : ''}`}>
              Meus Pedidos
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'nav-link--active' : ''}`}>
              Painel Admin
            </Link>
          )}
        </nav>

        {/* Ações do Cabeçalho */}
        <div className="header-actions">
          {session ? (
            <div className="user-menu desktop-only">
              <span className="user-greeting">
                Olá, <strong>{session.user?.name ? session.user.name.split(' ')[0] : 'Cliente'}</strong>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
                Sair
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-ghost btn-sm desktop-only">
              Entrar
            </Link>
          )}

          <button
            type="button"
            className="cart-trigger"
            onClick={() => { setMenuAberto(false); onOpenCart(); }}
            aria-label={`Carrinho com ${quantidadeItensCarrinho} itens`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {quantidadeItensCarrinho > 0 && (
              <span className="cart-badge">{quantidadeItensCarrinho}</span>
            )}
          </button>

          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            className={`hamburger-btn ${menuAberto ? 'hamburger-btn--active' : ''}`}
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={menuAberto}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </div>

      {/* Menu / Gaveta Mobile */}
      <div className={`header-mobile-drawer ${menuAberto ? 'header-mobile-drawer--open' : ''}`}>
        <div className="header-mobile-content">
          {session && (
            <div className="mobile-user-info">
              <div className="mobile-user-avatar">
                {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="mobile-user-text">
                <p className="mobile-user-name">{session.user?.name}</p>
                <p className="mobile-user-email">{session.user?.email}</p>
              </div>
            </div>
          )}

          <nav className="mobile-nav">
            <Link
              to="/"
              className={`mobile-nav-link ${isActive('/') ? 'mobile-nav-link--active' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              Vitrine
            </Link>
            {session && (
              <Link
                to="/meus-pedidos"
                className={`mobile-nav-link ${isActive('/meus-pedidos') ? 'mobile-nav-link--active' : ''}`}
                onClick={() => setMenuAberto(false)}
              >
                Meus Pedidos
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`mobile-nav-link ${isActive('/admin') ? 'mobile-nav-link--active' : ''}`}
                onClick={() => setMenuAberto(false)}
              >
                Painel Administrativo
              </Link>
            )}
          </nav>

          <div className="mobile-auth-section">
            {session ? (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => { setMenuAberto(false); onLogout(); }}
              >
                Sair da Conta
              </button>
            ) : (
              <Link
                to="/auth"
                className="btn btn-primary btn-block"
                onClick={() => setMenuAberto(false)}
              >
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>
      </div>

      {menuAberto && (
        <div className="mobile-backdrop" onClick={() => setMenuAberto(false)}></div>
      )}
    </header>
  );
}
