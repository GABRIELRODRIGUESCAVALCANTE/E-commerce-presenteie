export function ProductSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid-produtos">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-text skeleton-text--lg" />
          <div className="skeleton skeleton-text skeleton-text--sm" />
          <div className="skeleton skeleton-button" />
        </div>
      ))}
    </div>
  );
}

export function OrderSkeletonList({ count = 3 }) {
  return (
    <div className="skeleton-orders">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-order-card">
          <div className="skeleton skeleton-text skeleton-text--lg" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text skeleton-text--sm" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Carregando...' }) {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
