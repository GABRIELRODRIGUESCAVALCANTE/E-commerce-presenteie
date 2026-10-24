import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import WhatsAppButton from './components/WhatsAppButton';
import ScrollToTop from './components/ScrollToTop';
import { Spinner } from './components/Skeleton';
import Home from './pages/Home';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MyOrders from './pages/MyOrders';
import NotFound from './pages/NotFound';

// O painel administrativo só é baixado por quem acessa /admin
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

function RotaAdmin({ children }) {
  const { user, isPending, isAdmin, adminLoading } = useAuth();
  if (isPending || adminLoading) return <Spinner label="Verificando credenciais..." />;
  if (!user) return <Navigate to="/auth?redirect=/admin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function Layout() {
  const { logout } = useAuth();
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    clearCart();
    showToast('Até logo! Volte sempre.', 'info');
    navigate('/');
  };

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <ScrollToTop />
      <Header onLogout={handleLogout} />
      <CartDrawer />

      <main id="conteudo" tabIndex={-1}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/produto/:id/:slug?" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido-confirmado" element={<OrderConfirmation />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/meus-pedidos" element={<MyOrders />} />
            <Route path="/admin" element={<RotaAdmin><AdminPage /></RotaAdmin>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Layout />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
