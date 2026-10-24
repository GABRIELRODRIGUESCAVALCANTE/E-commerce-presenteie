export function ProductSkeletonGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="product-card product-card--skeleton">
          <div className="skeleton skeleton--image" />
          <div className="product-card__body">
            <div className="skeleton skeleton--text" style={{ width: '80%' }} />
            <div className="skeleton skeleton--text" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderSkeletonList({ count = 3 }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card--padded">
          <div className="skeleton skeleton--text" style={{ width: '30%' }} />
          <div className="skeleton skeleton--text" style={{ width: '60%' }} />
          <div className="skeleton skeleton--text" style={{ width: '45%' }} />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Carregando...', inline = false }) {
  return (
    <div className={inline ? 'spinner-inline' : 'spinner-wrapper'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className={inline ? 'sr-only' : ''}>{label}</span>
    </div>
  );
}
