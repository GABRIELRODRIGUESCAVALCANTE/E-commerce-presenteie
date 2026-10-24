import { useLocation } from 'react-router-dom';
import { WhatsAppIcon } from './Icon';
import { whatsappLink } from '../config/store';

// Em telas de formulário (login, checkout, painel) o botão flutuante cobriria ações principais
const HIDDEN_PATHS = ['/auth', '/esqueci-senha', '/redefinir-senha', '/checkout', '/pedido-confirmado', '/admin'];

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;

  return (
    <aside aria-label="Atendimento pelo WhatsApp">
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab"
        aria-label="Fale conosco pelo WhatsApp (abre em nova aba)"
      >
        <WhatsAppIcon size={28} />
        <span className="whatsapp-fab__label">Atendimento</span>
      </a>
    </aside>
  );
}
