import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Icon, { GoogleIcon } from '../components/Icon';
import { Field, PasswordInput } from '../components/Field';
import { authClient } from '../auth';
import { enviarCodigoVerificacao, verificarCodigo } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { authErrorMessage, safeRedirect } from '../utils/authErrors';

function GoogleButton({ redirect }) {
  const { showToast } = useToast();
  const handleGoogleLogin = async () => {
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}${redirect}`,
      });
      if (error) throw error;
    } catch (erro) {
      showToast(authErrorMessage(erro, 'Erro ao entrar com Google.'), 'error');
    }
  };
  return (
    <button type="button" onClick={handleGoogleLogin} className="btn btn--outline-neutral btn--lg btn--block">
      <GoogleIcon /> Continuar com o Google
    </button>
  );
}

function VerifyStep({ email, nome, senha, redirect, onBack }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setErro('');
    if (!/^\d{6}$/.test(codigo)) {
      setErro('Digite o código de 6 dígitos recebido por e-mail.');
      return;
    }
    setEnviando(true);
    try {
      await verificarCodigo(email, codigo);
      const { error } = await authClient.signUp.email({ email, password: senha, name: nome.trim() });
      if (error) throw error;
      showToast('E-mail verificado e conta criada com sucesso!', 'success');
      navigate(redirect, { replace: true });
    } catch (err) {
      setErro(err?.response ? getErrorMessage(err, 'Código incorreto ou expirado.') : authErrorMessage(err, 'Código incorreto ou expirado.'));
    } finally {
      setEnviando(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || enviando) return;
    setEnviando(true);
    try {
      await enviarCodigoVerificacao(email);
      setCooldown(60);
      setCodigo('');
      showToast('Novo código enviado para seu e-mail!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao reenviar código.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-card">
      <span className="auth-card__icon"><Icon name="mail" size={26} /></span>
      <h1 className="auth-card__title">Verifique seu e-mail</h1>
      <p className="auth-card__subtitle">
        Enviamos um código de 6 dígitos para <strong>{email}</strong>. Digite-o abaixo para concluir seu cadastro.
      </p>

      <form onSubmit={handleVerifyAndRegister} className="form-stack" noValidate>
        <Field label="Código de verificação" error={erro}>
          <input
            className="input input--otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </Field>
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
          {enviando ? 'Verificando...' : 'Confirmar e criar conta'}
        </button>
      </form>

      <div className="auth-card__footer">
        <button type="button" className="link" onClick={handleResendCode} disabled={cooldown > 0 || enviando}>
          <Icon name="refresh" size={16} /> {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
        </button>
        <button type="button" className="link link--muted" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Alterar dados ou e-mail
        </button>
      </div>
      <p className="auth-card__hint">Não encontrou? Confira a caixa de spam ou promoções.</p>
    </div>
  );
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLogin = searchParams.get('modo') !== 'cadastro';
  const redirect = safeRedirect(searchParams.get('redirect'));
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const { showToast } = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [step, setStep] = useState('form');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  usePageMeta(isLogin ? 'Entrar' : 'Criar conta');

  if (!isPending && user && step === 'form') return <Navigate to={redirect} replace />;

  const setModo = (modo) => {
    setErro('');
    setStep('form');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (modo === 'cadastro') next.set('modo', 'cadastro');
      else next.delete('modo');
      return next;
    }, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (isLogin) {
      setEnviando(true);
      try {
        const { error } = await authClient.signIn.email({ email: email.trim(), password: senha });
        if (error) throw error;
        showToast('Login realizado com sucesso!', 'success');
        navigate(redirect, { replace: true });
      } catch (err) {
        setErro(authErrorMessage(err, 'Erro na autenticação.'));
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (nome.trim().length < 2) {
      setErro('Por favor, informe seu nome.');
      return;
    }
    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      await enviarCodigoVerificacao(email.trim());
      setStep('verify');
      showToast(`Código de 6 dígitos enviado para ${email.trim()}`, 'info');
    } catch (err) {
      setErro(getErrorMessage(err, 'Erro ao enviar código de verificação.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        {step === 'verify' && !isLogin ? (
          <VerifyStep email={email.trim()} nome={nome} senha={senha} redirect={redirect} onBack={() => setStep('form')} />
        ) : (
          <div className="auth-card">
            <div className="segmented" role="tablist" aria-label="Acesso à conta">
              <button type="button" role="tab" aria-selected={isLogin} className={`segmented__item ${isLogin ? 'is-active' : ''}`} onClick={() => setModo('login')}>
                Entrar
              </button>
              <button type="button" role="tab" aria-selected={!isLogin} className={`segmented__item ${!isLogin ? 'is-active' : ''}`} onClick={() => setModo('cadastro')}>
                Criar conta
              </button>
            </div>

            <h1 className="auth-card__title">{isLogin ? 'Bem-vindo(a) de volta' : 'Crie sua conta'}</h1>
            <p className="auth-card__subtitle">
              {isLogin ? 'Acesse sua conta para acompanhar seus pedidos.' : 'Cadastre-se e receba confirmações de pedidos por e-mail.'}
            </p>

            {redirect === '/checkout' && (
              <p className="alert alert--info"><Icon name="info" size={18} /> Entre ou crie sua conta para finalizar a compra. Seu carrinho fica salvo.</p>
            )}

            <GoogleButton redirect={redirect} />

            <div className="divider"><span>ou com seu e-mail</span></div>

            <form onSubmit={handleSubmit} className="form-stack" noValidate>
              {erro && (
                <div className="alert alert--error" role="alert"><Icon name="alert" size={18} /> <span>{erro}</span></div>
              )}
              {!isLogin && (
                <Field label="Nome completo">
                  <input className="input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
                </Field>
              )}
              <Field label="E-mail">
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
              </Field>
              <Field label="Senha" hint={!isLogin ? 'Mínimo de 8 caracteres.' : undefined}>
                <PasswordInput
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                />
              </Field>
              {isLogin && (
                <Link to="/esqueci-senha" className="link form-stack__aside">Esqueci minha senha</Link>
              )}
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
                {enviando ? 'Aguarde...' : isLogin ? 'Entrar' : 'Continuar'}
              </button>
            </form>

            <p className="auth-card__switch">
              {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
              <button type="button" className="link" onClick={() => setModo(isLogin ? 'cadastro' : 'login')}>
                {isLogin ? 'Cadastre-se' : 'Entre aqui'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
