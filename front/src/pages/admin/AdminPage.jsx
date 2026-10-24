import { useState } from 'react';
import Icon from '../../components/Icon';
import { usePageMeta } from '../../hooks/usePageMeta';
import OrdersTab from './OrdersTab';
import StockTab from './StockTab';
import ProductForm from './ProductForm';

const TABS = [
  { id: 'pedidos', label: 'Pedidos', icon: 'package' },
  { id: 'estoque', label: 'Estoque', icon: 'box' },
  { id: 'produtos', label: 'Novo produto', icon: 'plus' },
];

export default function AdminPage() {
  const [abaAtiva, setAbaAtiva] = useState('pedidos');
  usePageMeta('Painel administrativo');

  const handleKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setAbaAtiva(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  };

  return (
    <div className="container page">
      <header className="page-header">
        <h1 className="page-title">Painel administrativo</h1>
        <p className="page-subtitle">Gerencie pedidos, estoque e produtos da loja</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Seções do painel">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={abaAtiva === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={abaAtiva === tab.id ? 0 : -1}
            className={`tabs__item ${abaAtiva === tab.id ? 'is-active' : ''}`}
            onClick={() => setAbaAtiva(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            <Icon name={tab.icon} size={18} /> {tab.label}
          </button>
        ))}
      </div>

      <div id={`panel-${abaAtiva}`} role="tabpanel" aria-labelledby={`tab-${abaAtiva}`} className="tabs__panel">
        {abaAtiva === 'pedidos' && <OrdersTab />}
        {abaAtiva === 'estoque' && <StockTab />}
        {abaAtiva === 'produtos' && <ProductForm onCreated={() => setAbaAtiva('estoque')} />}
      </div>
    </div>
  );
}
