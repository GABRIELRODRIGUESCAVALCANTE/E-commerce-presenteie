import Icon from './Icon';

export default function QuantityStepper({ value, onChange, min = 1, max, size = 'md', label = 'Quantidade' }) {
  const atMax = Number.isFinite(max) && value >= max;
  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
      >
        <Icon name="minus" size={16} />
      </button>
      <output className="stepper__value" aria-live="polite">{value}</output>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label="Aumentar quantidade"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
