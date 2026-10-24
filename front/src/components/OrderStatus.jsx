import Icon from './Icon';
import { STATUS_LABELS, STATUS_OPTIONS } from '../utils/format';

const STATUS_ICONS = { pendente: 'clock', em_separacao: 'package', enviado: 'store', entregue: 'checkCircle' };

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon name={STATUS_ICONS[status] || 'info'} size={14} />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/** Linha do tempo com as etapas do pedido, destacando a etapa atual. */
export function StatusTimeline({ status }) {
  const atual = STATUS_OPTIONS.findIndex((s) => s.value === status);
  return (
    <ol className="timeline" aria-label={`Status do pedido: ${STATUS_LABELS[status] || status}`}>
      {STATUS_OPTIONS.map((s, i) => (
        <li
          key={s.value}
          className={`timeline__step ${i < atual ? 'is-done' : ''} ${i === atual ? 'is-current' : ''}`}
          aria-current={i === atual ? 'step' : undefined}
        >
          <span className="timeline__dot">{i < atual ? <Icon name="check" size={12} strokeWidth={3} /> : null}</span>
          <span className="timeline__label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
