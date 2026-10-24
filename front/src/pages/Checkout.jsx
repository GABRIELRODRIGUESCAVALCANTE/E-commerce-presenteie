import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import PickupInfo from '../components/PickupInfo';
import { Field } from '../components/Field';
import { Spinner } from '../components/Skeleton';
import { criarPedido } from '../api';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { usePageMeta } from '../hooks/usePageMeta';
import { PAYMENT_METHODS } from '../config/store';
import { formatPreco, imageUrl, maskTelefone, telefoneValido } from '../utils/format';

const PHONE_KEY = 'presenteie:telefone';
const PAYMENT_ICONS = { 'cartão': 'card', pix: 'pix', 'espécie': 'cash' };

function savedPhone() {
  try {
    return localStorage.getItem(PHONE_KEY) || '';
  } catch {
    return '';
  }
}

function CheckoutForm({ user }) {
  const { items, count, subtotal, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [nome, setNome] = useState(user.name || '');
  const [telefone, setTelefone] = useState(savedPhone);
  const [metodoPagamento, setMetodoPagamento] = useState('cartão');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const validar = () => {
    const next = {};
    if (nome.trim().length < 3) next.nome = 'Informe seu nome completo.';
    if (!telefoneValido(telefone)) next.telefone = 'Informe um telefone válido com DDD.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const processarPedido = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validar()) return;

    setEnviando(true);
    try {
      const resultado = await criarPedido({
        nome_cliente: nome.trim(),
        telefone,
        metodo_entrega: 'retirada',
        metodo_pagamento: metodoPagamento,
        itens: items.map(({ id, quantidade }) => ({ id, quantidade })),
      });
      try {
        localStorage.setItem(PHONE_KEY, telefone);
      } catch {
        // Preferência opcional; ignorar se o armazenamento estiver indisponível
      }
      const resumo = {
        pedidoId: resultado.pedidoId,
        total: resultado.total ?? subtotal,
        metodoPagamento,
        nome: nome.trim(),
        itens: items,
      };
      clearCart();
      navigate('/pedido-confirmado', { replace: true, state: resumo });
    } catch (err) {
      const message = getErrorMessage(err, 'Não foi possível concluir o pedido. Tente novamente.');
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container page">
      <nav className="checkout-steps" aria-label="Etapas da compra">
        <Link to="/carrinho" className="checkout-steps__item checkout-steps__item--done"><Icon name="check" size={14} /> Carrinho</Link>
        <Icon name="chevronRight" size={14} />
        <span className="checkout-steps__item checkout-steps__item--current" aria-current="step">Confirmação</span>
        <Icon name="chevronRight" size={14} />
        <span className="checkout-steps__item">Retirada</span>
      </nav>

      <header className="page-header">
        <h1 className="page-title">Finalizar compra</h1>
        <p className="page-subtitle">Confirme seus dados — o pagamento é feito somente na retirada.</p>
      </header>

      <div className="checkout-layout">
        <form id="checkout-form" className="checkout-form" onSubmit={processarPedido} noValidate>
          {submitError && (
            <div className="alert alert--error" role="alert">
              <Icon name="alert" size={20} />
              <div>
                <p className="alert__title">Não foi possível concluir o pedido</p>
                <p>{submitError}</p>
                {/estoque|disponível/i.test(submitError) && (
                  <Link to="/carrinho" className="link">Revisar carrinho</Link>
                )}
              </div>
            </div>
          )}

          <section className="card card--padded checkout-section" aria-labelledby="dados-titulo">
            <h2 id="dados-titulo" className="checkout-section__title"><span className="checkout-section__number">1</span> Seus dados</h2>
            <div className="form-grid">
              <Field label="Nome completo" error={errors.nome}>
                <input
                  className="input"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (errors.nome) setErrors((er) => ({ ...er, nome: undefined }));
                  }}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </Field>
              <Field label="Telefone / WhatsApp" error={errors.telefone} hint="Usaremos para avisar quando o pedido estiver pronto.">
                <input
                  className="input"
                  type="tel"
                  inputMode="tel"
                  value={telefone}
                  onChange={(e) => {
                    const valor = maskTelefone(e.target.value);
                    setTelefone(valor);
                    if (errors.telefone && telefoneValido(valor)) setErrors((er) => ({ ...er, telefone: undefined }));
                  }}
                  placeholder="(85) 99999-0000"
                  autoComplete="tel-national"
                  required
                />
              </Field>
            </div>
            <p className="checkout-section__meta"><Icon name="mail" size={16} /> A confirmação será enviada para <strong>{user.email}</strong></p>
          </section>

          <section className="card card--padded checkout-section" aria-labelledby="retirada-titulo">
            <h2 id="retirada-titulo" className="checkout-section__title"><span className="checkout-section__number">2</span> Retirada</h2>
            <p className="muted">Estamos trabalhando exclusivamente com retirada no local. O pagamento é realizado diretamente na retirada do produto.</p>
            <PickupInfo compact />
          </section>

          <fieldset className="card card--padded checkout-section">
            <legend className="checkout-section__title"><span className="checkout-section__number">3</span> Forma de pagamento (na retirada)</legend>
            <div className="radio-cards">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.value} className={`radio-card ${metodoPagamento === m.value ? 'radio-card--checked' : ''}`}>
                  <input
                    type="radio"
                    name="pagamento"
                    value={m.value}
                    checked={metodoPagamento === m.value}
                    onChange={() => setMetodoPagamento(m.value)}
                  />
                  <span className="radio-card__icon"><Icon name={PAYMENT_ICONS[m.value]} size={22} /></span>
                  <span className="radio-card__text">
                    <span className="radio-card__label">{m.label}</span>
                    <span className="radio-card__desc">{m.description}</span>
                  </span>
                  <Icon name="checkCircle" size={20} className="radio-card__check" />
                </label>
              ))}
            </div>
          </fieldset>
        </form>

        <aside className="checkout-summary" aria-label="Resumo do pedido">
          <div className="card card--padded summary">
            <h2 className="summary__title">Resumo do pedido</h2>
            <ul className="summary-items">
              {items.map((item) => (
                <li key={item.id} className="summary-item">
                  <span className="summary-item__thumb">
                    <img src={imageUrl(item.imagem_url, 120)} alt="" width="56" height="56" loading="lazy" />
                    <span className="summary-item__qty">{item.quantidade}</span>
                  </span>
                  <span className="summary-item__name">{item.nome}</span>
                  <span className="summary-item__price">{formatPreco(Number(item.preco) * item.quantidade)}</span>
                </li>
              ))}
            </ul>
            <div className="summary-row"><span>Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span><span>{formatPreco(subtotal)}</span></div>
            <div className="summary-row summary-row--muted"><span>Retirada no local</span><span className="text-success">Grátis</span></div>
            <div className="summary-row summary-row--total"><span>Total</span><span>{formatPreco(subtotal)}</span></div>
            <button type="submit" form="checkout-form" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
              {enviando ? <><span className="spinner spinner--sm" aria-hidden="true" /> Enviando pedido...</> : <>Confirmar pedido</>}
            </button>
            <p className="summary__note"><Icon name="shield" size={16} /> Nenhum pagamento é cobrado agora.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { user, isPending } = useAuth();
  const { items } = useCart();
  usePageMeta('Finalizar compra');

  if (isPending) return <Spinner label="Carregando..." />;
  if (!user) return <Navigate to="/auth?redirect=/checkout" replace />;

  if (items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="bag" title="Seu carrinho está vazio" description="Adicione presentes ao carrinho para finalizar a compra.">
          <Link to="/#catalogo" className="btn btn--primary">Explorar vitrine</Link>
        </EmptyState>
      </div>
    );
  }

  return <CheckoutForm user={user} />;
}
