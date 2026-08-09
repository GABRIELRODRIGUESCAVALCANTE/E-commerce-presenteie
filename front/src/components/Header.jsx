import { Link, useLocation } from 'react-router-dom';

export default function Header({
  session,
  quantidadeItensCarrinho,
  onOpenCart,
  onLogout,
}) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header glassmorphism">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="logo-icon"></span>
          <span className="logo-text">presenteie</span>
        </Link>

        <nav className="header-nav">
          <Link to="/" className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}>
            Vitrine
          </Link>
          {session && (
            <Link to="/meus-pedidos" className={`nav-link ${isActive('/meus-pedidos') ? 'nav-link--active' : ''}`}>
              Meus Pedidos
            </Link>
          )}
          {session?.user?.email === (import.meta.env.VITE_ADMIN_EMAIL || 'teste@gmail.com') && (
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'nav-link--active' : ''}`}>
              Painel Admin
            </Link>
          )}
        </nav>

        <div className="header-actions">
          {session ? (
            <div className="user-menu">
              <span className="user-greeting">
                Olá, <strong>{session.user.name.split(' ')[0]}</strong>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
                Sair
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-ghost btn-sm">
              Entrar
            </Link>
          )}

          <button
            type="button"
            className="cart-trigger"
            onClick={onOpenCart}
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
        </div>
      </div>
    </header>
  );
}
