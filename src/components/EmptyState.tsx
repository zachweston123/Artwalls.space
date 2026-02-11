import { ReactNode } from 'react';

interface ActionConfig {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction: ActionConfig;
  secondaryAction?: ActionConfig;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const renderAction = (action: ActionConfig, primary = false) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]';
    const primaryClasses = 'bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]';
    const secondaryClasses = 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]';

    if (action.href) {
      return (
        <a
          href={action.href}
          onClick={action.onClick}
          className={`${baseClasses} ${primary ? primaryClasses : secondaryClasses}`}
        >
          {action.icon}
          <span>{action.label}</span>
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={action.onClick}
        className={`${baseClasses} ${primary ? primaryClasses : secondaryClasses}`}
      >
        {action.icon}
        <span>{action.label}</span>
      </button>
    );
  };

  return (
    <div className={`text-center px-6 py-12 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl ${className}`}>
      {icon && (
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">{description}</p>}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {renderAction(primaryAction, true)}
        {secondaryAction && renderAction(secondaryAction, false)}
      </div>
    </div>
  );
}
