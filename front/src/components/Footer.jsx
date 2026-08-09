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
        
        
        
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Presenteie. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
