import { ReactNode } from 'react';

interface ActionConfig {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  primaryAction,
  secondaryAction,
  className = '',
}: PageHeaderProps) {
  const renderAction = (action: ActionConfig, primary = false) => {
    const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors';
    const primaryClasses = 'bg-[var(--green)] text-[var(--accent-contrast)] hover:opacity-90 focus:ring-2 focus:ring-[var(--focus)] focus:ring-offset-1 focus:ring-offset-[var(--bg)]';
    const secondaryClasses = 'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--focus)] focus:ring-offset-1 focus:ring-offset-[var(--bg)]';

    const Component = action.href ? 'a' : 'button';
    const props: any = {
      className: `${base} ${primary ? primaryClasses : secondaryClasses}`,
    };
    if (action.href) props.href = action.href;
    if (action.onClick) props.onClick = action.onClick;
    if (!action.href) props.type = 'button';

    return (
      <Component {...props}>
        {action.icon}
        <span>{action.label}</span>
      </Component>
    );
  };

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="space-y-1">
        {breadcrumb && <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">{breadcrumb}</p>}
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)] leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 self-start sm:self-center">
          {secondaryAction && renderAction(secondaryAction, false)}
          {primaryAction && renderAction(primaryAction, true)}
        </div>
      )}
    </div>
  );
}
