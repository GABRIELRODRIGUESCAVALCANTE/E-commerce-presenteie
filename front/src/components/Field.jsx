import { useId, useState, Children, cloneElement, isValidElement } from 'react';
import Icon from './Icon';

/**
 * Campo de formulário com rótulo, dica e mensagem de erro associados ao controle (acessibilidade).
 */
export function Field({ label, hint, error, optional = false, children, className = '' }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = Children.only(children);
  const enhanced = isValidElement(control)
    ? cloneElement(control, {
        id: control.props.id || id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : control;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={control.props.id || id}>
          {label}
          {optional && <span className="field__optional"> (opcional)</span>}
        </label>
      )}
      {enhanced}
      {hint && !error && <p id={hintId} className="field__hint">{hint}</p>}
      {error && (
        <p id={errorId} className="field__error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <input {...props} type={visible ? 'text' : 'password'} className="input" />
      <button
        type="button"
        className="input-group__btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

/** Select estilizado; repassa id/aria ao <select> para o rótulo do <Field> funcionar. */
export function Select({ children, className = '', ...props }) {
  return (
    <div className="select-wrap">
      <select {...props} className={`select ${className}`}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="select-wrap__icon" />
    </div>
  );
}
