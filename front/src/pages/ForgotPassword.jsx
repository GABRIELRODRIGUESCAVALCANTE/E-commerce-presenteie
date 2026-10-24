import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { Field } from '../components/Field';
import { authClient } from '../auth';
import { usePageMeta } from '../hooks/usePageMeta';
import { authErrorMessage } from '../utils/authErrors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  usePageMeta('Recuperar senha');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setEnviando(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      setErro(authErrorMessage(err, 'Não foi possível enviar o link. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-card">
          <span className="auth-card__icon"><Icon name={enviado ? 'mail' : 'lock'} size={26} /></span>
          {enviado ? (
            <>
              <h1 className="auth-card__title">Confira seu e-mail</h1>
              <p className="auth-card__subtitle">
                Se existir uma conta para <strong>{email.trim()}</strong>, você receberá um link para criar uma nova senha. O link expira em 1 hora.
              </p>
              <Link to="/auth" className="btn btn--primary btn--lg btn--block">Voltar para o login</Link>
            </>
          ) : (
            <>
              <h1 className="auth-card__title">Esqueceu sua senha?</h1>
              <p className="auth-card__subtitle">Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.</p>
              <form onSubmit={handleSubmit} className="form-stack" noValidate>
                <Field label="E-mail" error={erro}>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoFocus required />
                </Field>
                <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
              <div className="auth-card__footer">
                <Link to="/auth" className="link link--muted"><Icon name="arrowLeft" size={16} /> Voltar para o login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
