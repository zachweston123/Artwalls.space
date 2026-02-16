import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeroHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  meta?: ReactNode;
  className?: string;
  /** Center-align title + subtitle (e.g. Pricing page) */
  center?: boolean;
  /** Optional breadcrumb text shown above the title */
  breadcrumb?: string;
}

export function PageHeroHeader({
  title,
  subtitle,
  icon,
  badges,
  actions,
  onBack,
  meta,
  className = '',
  center = false,
  breadcrumb,
}: PageHeroHeaderProps) {
  return (
    <div
      className={`mb-8 ${className}`}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
      }}
    >
      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-center ${
          center ? 'sm:justify-center' : 'sm:justify-between'
        }`}
      >
        {/* Left: back + icon + text */}
        <div
          className={`flex items-start gap-3 min-w-0 ${
            center ? 'sm:flex-col sm:items-center sm:text-center' : ''
          }`}
        >
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="shrink-0 mt-0.5 p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'var(--surface-3)')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '')}
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {icon && (
            <div
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--accent)',
              }}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0">
            {breadcrumb && (
              <p
                className="text-xs uppercase tracking-[0.08em] mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {breadcrumb}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-2xl sm:text-3xl font-semibold leading-tight"
                style={{ color: 'var(--text)' }}
              >
                {title}
              </h1>
              {badges && <>{badges}</>}
            </div>
            {subtitle && (
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {subtitle}
              </p>
            )}
            {meta && <div className="flex flex-wrap items-center gap-2 mt-2">{meta}</div>}
          </div>
        </div>

        {/* Right: actions */}
        {actions && !center && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
