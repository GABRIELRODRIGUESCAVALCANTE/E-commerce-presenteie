import { Link } from 'react-router-dom';
import Icon, { WhatsAppIcon } from './Icon';
import { STORE, whatsappLink } from '../config/store';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Link to="/" className="logo logo--light">
            <span className="logo__mark"><Icon name="gift" size={20} strokeWidth={2} /></span>
            <span className="logo__text">presenteie</span>
          </Link>
          <p>Transformando momentos comuns em lembranças inesquecíveis. O melhor lugar para encontrar presentes com significado.</p>
        </div>

        <div>
          <h2 className="site-footer__title">Navegação</h2>
          <ul className="site-footer__links">
            <li><Link to="/">Início</Link></li>
            <li><Link to="/#catalogo">Todos os presentes</Link></li>
            <li><Link to="/carrinho">Carrinho</Link></li>
            <li><Link to="/meus-pedidos">Meus pedidos</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="site-footer__title">Atendimento</h2>
          <ul className="site-footer__links">
            <li>
              <a href={whatsappLink('Olá! Gostaria de tirar algumas dúvidas sobre os presentes.')} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={18} /> {STORE.whatsappDisplay}
              </a>
            </li>
            <li className="site-footer__note">Dúvidas ou pedidos especiais? Fale com a gente pelo WhatsApp.</li>
          </ul>
        </div>

        <div>
          <h2 className="site-footer__title">Retirada e pagamento</h2>
          <ul className="site-footer__links">
            <li>
              <a href={STORE.mapsUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="mapPin" size={18} /> Ver no Google Maps
              </a>
            </li>
            <li className="site-footer__note">Pagamento e retirada presenciais.</li>
            <li className="site-footer__payments" aria-label="Formas de pagamento aceitas">
              <span><Icon name="card" size={16} /> Cartão</span>
              <span><Icon name="pix" size={16} /> PIX</span>
              <span><Icon name="cash" size={16} /> Dinheiro</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Presenteie. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
