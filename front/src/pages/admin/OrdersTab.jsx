import { useEffect, useMemo, useState } from 'react';
import Icon, { WhatsAppIcon } from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import { OrderSkeletonList } from '../../components/Skeleton';
import { StatusBadge } from '../../components/OrderStatus';
import { getPedidosAdmin, atualizarStatusPedido } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { PAYMENT_LABELS, STATUS_LABELS, STATUS_OPTIONS, formatPreco } from '../../utils/format';

const clienteWhatsApp = (telefone) => {
  const digits = String(telefone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

export default function OrdersTab() {
  const { showToast } = useToast();
  const [pedidos, setPedidos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [atualizando, setAtualizando] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setStatus('loading');
    getPedidosAdmin()
      .then((data) => {
        setPedidos(Array.isArray(data) ? data : []);
        setStatus('success');
      })
      .catch((err) => {
        setErro(getErrorMessage(err, 'Erro ao carregar pedidos.'));
        setStatus('error');
      });
  }, [reloadKey]);

  const contagem = useMemo(() => {
    const c = { todos: pedidos.length };
    pedidos.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [pedidos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p) =>
      (filtro === 'todos' || p.status === filtro) &&
      (!termo || String(p.id) === termo.replace('#', '') || p.nome_cliente?.toLowerCase().includes(termo) || p.telefone?.includes(termo))
    );
  }, [pedidos, filtro, busca]);

  const atualizarStatus = async (pedidoId, novoStatus) => {
    setAtualizando(pedidoId);
    try {
      await atualizarStatusPedido(pedidoId, novoStatus);
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p)));
      showToast(`Pedido #${pedidoId} → ${STATUS_LABELS[novoStatus]}`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao atualizar status.'), 'error');
    } finally {
      setAtualizando(null);
    }
  };

  if (status === 'loading') return <OrderSkeletonList />;
  if (status === 'error') {
    return (
      <EmptyState icon="alert" tone="error" title="Erro ao carregar pedidos" description={erro}>
        <button type="button" className="btn btn--primary" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size={18} /> Tentar novamente</button>
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <div className="admin-toolbar">
        <div className="chips" role="group" aria-label="Filtrar pedidos por status">
          {[{ value: 'todos', label: 'Todos' }, ...STATUS_OPTIONS].map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip ${filtro === opt.value ? 'chip--active' : ''}`}
              aria-pressed={filtro === opt.value}
              onClick={() => setFiltro(opt.value)}
            >
              {opt.label} <span className="chip__count">{contagem[opt.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="search search--inline">
          <Icon name="search" size={18} className="search__icon" />
          <label htmlFor="busca-pedidos" className="sr-only">Buscar pedidos</label>
          <input id="busca-pedidos" type="search" className="search__input" placeholder="Nº do pedido, cliente ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((k) => k + 1)}>
          <Icon name="refresh" size={16} /> Atualizar
        </button>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState icon="package" title={pedidos.length === 0 ? 'Nenhum pedido recebido ainda' : 'Nenhum pedido encontrado'} description={pedidos.length === 0 ? undefined : 'Ajuste os filtros ou a busca.'} />
      ) : (
        visiveis.map((pedido) => {
          const whatsapp = clienteWhatsApp(pedido.telefone);
          return (
            <article key={pedido.id} className="card admin-order">
              <header className="admin-order__header">
                <div>
                  <h2 className="order-card__title">Pedido #{pedido.id}</h2>
                  <p className="order-card__date">{pedido.data_formatada}</p>
                </div>
                <div className="admin-order__right">
                  <StatusBadge status={pedido.status} />
                  <p className="admin-order__total">{formatPreco(pedido.total)}</p>
                </div>
              </header>

              <div className="admin-order__grid">
                <div>
                  <p className="admin-order__label">Cliente</p>
                  <p className="admin-order__value">{pedido.nome_cliente}</p>
                  {pedido.telefone && (
                    whatsapp ? (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="link"><WhatsAppIcon size={16} /> {pedido.telefone}</a>
                    ) : <p className="muted">{pedido.telefone}</p>
                  )}
                </div>
                <div>
                  <p className="admin-order__label">{pedido.metodo_entrega === 'entrega' ? 'Entrega' : 'Retirada no local'}</p>
                  {pedido.metodo_entrega === 'entrega' && <p className="admin-order__value">{pedido.endereco} — {pedido.cidade} (CEP: {pedido.cep})</p>}
                  <p className="admin-order__label">Pagamento</p>
                  <p className="admin-order__value">{PAYMENT_LABELS[pedido.metodo_pagamento] || pedido.metodo_pagamento || 'N/A'}</p>
                </div>
                <div>
                  <p className="admin-order__label">Itens</p>
                  <ul className="admin-order__items">
                    {pedido.itens.map((item, index) => (
                      <li key={index}>{item.quantidade}x {item.nome} — {formatPreco(item.preco_unitario)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="admin-order__status" role="group" aria-label={`Alterar status do pedido ${pedido.id}`}>
                <span className="admin-order__label">Alterar status:</span>
                <div className="segmented segmented--sm">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segmented__item ${pedido.status === opt.value ? 'is-active' : ''}`}
                      aria-pressed={pedido.status === opt.value}
                      disabled={atualizando === pedido.id || pedido.status === opt.value}
                      onClick={() => atualizarStatus(pedido.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
