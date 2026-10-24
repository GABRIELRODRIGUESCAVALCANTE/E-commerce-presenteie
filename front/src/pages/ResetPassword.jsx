import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Field, PasswordInput } from '../components/Field';
import { authClient } from '../auth';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { authErrorMessage } from '../utils/authErrors';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const linkInvalido = !token || searchParams.get('error');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  usePageMeta('Criar nova senha');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) return setErro('A senha deve ter no mínimo 8 caracteres.');
    if (senha !== confirmacao) return setErro('As senhas não coincidem.');
    setEnviando(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword: senha, token });
      if (error) throw error;
      showToast('Senha redefinida! Entre com sua nova senha.', 'success');
      navigate('/auth', { replace: true });
    } catch (err) {
      setErro(authErrorMessage(err, 'Não foi possível redefinir a senha.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-card">
          <span className="auth-card__icon"><Icon name="lock" size={26} /></span>
          {linkInvalido ? (
            <>
              <h1 className="auth-card__title">Link inválido ou expirado</h1>
              <p className="auth-card__subtitle">Solicite um novo link de redefinição de senha para continuar.</p>
              <Link to="/esqueci-senha" className="btn btn--primary btn--lg btn--block">Solicitar novo link</Link>
            </>
          ) : (
            <>
              <h1 className="auth-card__title">Criar nova senha</h1>
              <p className="auth-card__subtitle">Escolha uma senha com pelo menos 8 caracteres.</p>
              <form onSubmit={handleSubmit} className="form-stack" noValidate>
                {erro && <div className="alert alert--error" role="alert"><Icon name="alert" size={18} /> <span>{erro}</span></div>}
                <Field label="Nova senha">
                  <PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" minLength={8} required autoFocus />
                </Field>
                <Field label="Confirme a nova senha">
                  <PasswordInput value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" minLength={8} required />
                </Field>
                <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
                  {enviando ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
