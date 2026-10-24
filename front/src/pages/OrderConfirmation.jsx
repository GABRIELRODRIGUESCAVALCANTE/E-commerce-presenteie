import { Link, Navigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { usePageMeta } from '../hooks/usePageMeta';
import { STORE } from '../config/store';
import { PAYMENT_LABELS, formatPreco, imageUrl, primeiroNome } from '../utils/format';

export default function OrderConfirmation() {
  const { state } = useLocation();
  usePageMeta('Pedido confirmado');

  if (!state?.pedidoId) return <Navigate to="/meus-pedidos" replace />;

  const { pedidoId, total, metodoPagamento, nome, itens = [] } = state;

  return (
    <div className="container page page--narrow">
      <div className="confirmation">
        <span className="confirmation__icon"><Icon name="check" size={36} strokeWidth={2.4} /></span>
        <h1 className="page-title">Pedido #{pedidoId} confirmado!</h1>
        <p className="page-subtitle">
          Obrigado, {primeiroNome(nome)}! Você receberá a confirmação no e-mail da sua conta.
        </p>
      </div>

      <div className="card card--padded">
        <h2 className="summary__title">Próximos passos</h2>
        <ol className="next-steps">
          <li>
            <span className="next-steps__icon"><Icon name="package" size={20} /></span>
            <div>
              <p className="next-steps__title">Separação do pedido</p>
              <p className="muted">Vamos preparar seu presente com carinho. Acompanhe o status em “Meus pedidos”.</p>
            </div>
          </li>
          <li>
            <span className="next-steps__icon"><Icon name="mapPin" size={20} /></span>
            <div>
              <p className="next-steps__title">Retirada no local</p>
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="link">Abrir localização no Google Maps</a>
            </div>
          </li>
          <li>
            <span className="next-steps__icon"><Icon name="card" size={20} /></span>
            <div>
              <p className="next-steps__title">Pagamento na retirada</p>
              <p className="muted">Forma escolhida: <strong>{PAYMENT_LABELS[metodoPagamento] || metodoPagamento}</strong></p>
            </div>
          </li>
        </ol>
      </div>

      {itens.length > 0 && (
        <div className="card card--padded">
          <h2 className="summary__title">Itens do pedido</h2>
          <ul className="summary-items">
            {itens.map((item) => (
              <li key={item.id} className="summary-item">
                <span className="summary-item__thumb">
                  <img src={imageUrl(item.imagem_url, 120)} alt="" width="56" height="56" loading="lazy" />
                  <span className="summary-item__qty">{item.quantidade}</span>
                </span>
                <span className="summary-item__name">{item.nome}</span>
                <span className="summary-item__price">{formatPreco(Number(item.preco) * item.quantidade)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row summary-row--total"><span>Total a pagar na retirada</span><span>{formatPreco(total)}</span></div>
        </div>
      )}

      <div className="confirmation__actions">
        <Link to="/meus-pedidos" className="btn btn--primary btn--lg">Acompanhar meus pedidos</Link>
        <Link to="/" className="btn btn--secondary btn--lg">Continuar comprando</Link>
      </div>
    </div>
  );
}
