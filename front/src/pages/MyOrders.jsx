import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { OrderSkeletonList, Spinner } from '../components/Skeleton';
import { StatusBadge, StatusTimeline } from '../components/OrderStatus';
import { getMeusPedidos } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { usePageMeta } from '../hooks/usePageMeta';
import { STORE } from '../config/store';
import { PAYMENT_LABELS, formatPreco, imageUrl } from '../utils/format';

function OrderCard({ pedido }) {
  const isRetirada = pedido.metodo_entrega === 'retirada' || pedido.endereco === 'Retirada';
  return (
    <article className="card order-card">
      <header className="order-card__header">
        <div>
          <h2 className="order-card__title">Pedido #{pedido.id}</h2>
          <p className="order-card__date">{pedido.data_formatada}</p>
        </div>
        <StatusBadge status={pedido.status} />
      </header>

      <StatusTimeline status={pedido.status} />

      <ul className="order-items">
        {pedido.itens.map((item, idx) => (
          <li key={`${item.produto_id || idx}-${idx}`} className="order-item">
            <img src={imageUrl(item.imagem_url, 120)} alt="" width="48" height="48" loading="lazy" className="order-item__thumb" />
            <span className="order-item__name">{item.quantidade}x {item.nome}</span>
            <span className="order-item__price">{formatPreco(item.preco_unitario)} cada</span>
          </li>
        ))}
      </ul>

      <footer className="order-card__footer">
        <div className="order-card__meta">
          {isRetirada ? (
            <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="link">
              <Icon name="mapPin" size={16} /> Retirada no local — ver endereço
            </a>
          ) : (
            <span><Icon name="mapPin" size={16} /> {pedido.endereco}, {pedido.cidade} — CEP: {pedido.cep}</span>
          )}
          {pedido.metodo_pagamento && (
            <span className="muted"><Icon name="card" size={16} /> {PAYMENT_LABELS[pedido.metodo_pagamento] || pedido.metodo_pagamento}</span>
          )}
        </div>
        <p className="order-card__total"><span>Total</span> {formatPreco(pedido.total)}</p>
      </footer>
    </article>
  );
}

export default function MyOrders() {
  const { user, isPending } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  usePageMeta('Meus pedidos');

  useEffect(() => {
    if (!user) return;
    setStatus('loading');
    getMeusPedidos(user.id)
      .then((data) => {
        setPedidos(Array.isArray(data) ? data : []);
        setStatus('success');
      })
      .catch((err) => {
        setErro(getErrorMessage(err, 'Não foi possível carregar seus pedidos.'));
        setStatus('error');
      });
  }, [user, reloadKey]);

  if (isPending) return <Spinner label="Carregando..." />;
  if (!user) return <Navigate to="/auth?redirect=/meus-pedidos" replace />;

  return (
    <div className="container page page--medium">
      <header className="page-header">
        <h1 className="page-title">Meus pedidos</h1>
        <p className="page-subtitle">Acompanhe o andamento das suas compras</p>
      </header>

      {status === 'loading' ? (
        <OrderSkeletonList />
      ) : status === 'error' ? (
        <EmptyState icon="alert" tone="error" title="Não foi possível carregar seus pedidos" description={erro}>
          <button type="button" className="btn btn--primary" onClick={() => setReloadKey((k) => k + 1)}>
            <Icon name="refresh" size={18} /> Tentar novamente
          </button>
        </EmptyState>
      ) : pedidos.length === 0 ? (
        <EmptyState icon="package" title="Você ainda não fez nenhum pedido" description="Quando você finalizar uma compra, ela aparecerá aqui.">
          <Link to="/#catalogo" className="btn btn--primary">Ir para a vitrine</Link>
        </EmptyState>
      ) : (
        <div className="stack">
          {pedidos.map((pedido) => <OrderCard key={pedido.id} pedido={pedido} />)}
        </div>
      )}
    </div>
  );
}
