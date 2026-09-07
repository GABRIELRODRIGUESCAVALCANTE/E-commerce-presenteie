import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer-premium">
      <div className="footer-grid">
        <div className="footer-col">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem' }}>Presenteie </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Transformando momentos comuns em lembranças inesquecíveis. O melhor lugar para encontrar presentes com significado.
          </p>
        </div>
        <div className="footer-col">
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>Atendimento</h4>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Dúvidas ou pedidos especiais? Fale conosco:
          </p>
          <a
            href="https://wa.me/5585992251640?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20sobre%20os%20presentes."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '0.5rem',
              color: '#25D366',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <span>💬 (85) 99225-1640</span>
          </a>
        </div>
        <div className="footer-col">
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>📍 Retirada</h4>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Pagamento e retirada presenciais.
          </p>
          <a
            href="https://maps.app.goo.gl/bJLVbX5qwyjFf67A9"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '0.5rem',
              color: 'var(--color-primary)',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'underline'
            }}
          >
            Ver no Google Maps ↗
          </a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Presenteie. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
