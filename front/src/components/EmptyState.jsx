import Icon from './Icon';

export default function EmptyState({ icon = 'gift', title, description, children, tone = 'default' }) {
  return (
    <div className={`empty-state empty-state--${tone}`}>
      <span className="empty-state__icon">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__text">{description}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}
