import Icon from './Icon';
import { STORE } from '../config/store';

/** Bloco com as regras de retirada e pagamento da loja (exibido no produto, carrinho e checkout). */
export default function PickupInfo({ compact = false }) {
  return (
    <div className={`pickup-info ${compact ? 'pickup-info--compact' : ''}`}>
      <div className="pickup-info__row">
        <span className="pickup-info__icon"><Icon name="store" size={18} /></span>
        <div>
          <p className="pickup-info__title">Retirada no local, sem custo</p>
          {!compact && <p className="pickup-info__text">Após confirmar o pedido, retire seu presente na nossa loja.</p>}
          <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer" className="link">
            Ver localização no Google Maps
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
      </div>
      <div className="pickup-info__row">
        <span className="pickup-info__icon"><Icon name="card" size={18} /></span>
        <div>
          <p className="pickup-info__title">Pagamento na retirada</p>
          <p className="pickup-info__text">Cartão, PIX ou dinheiro.</p>
        </div>
      </div>
    </div>
  );
}
