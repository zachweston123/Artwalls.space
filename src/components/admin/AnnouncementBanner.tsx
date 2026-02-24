import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface AnnouncementBannerProps {
  type?: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message?: string;
  linkText?: string;
  onLinkClick?: () => void;
  onDismiss?: () => void;
}

export function AnnouncementBanner({ 
  type = 'info', 
  title, 
  message,
  linkText,
  onLinkClick,
  onDismiss 
}: AnnouncementBannerProps) {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[var(--green-muted)] border-[var(--border)]',
          icon: <CheckCircle className="w-5 h-5 text-[var(--green)]" />,
          text: 'text-[var(--green)]',
          link: 'text-[var(--green)] hover:opacity-90',
        };
      case 'warning':
        return {
          bg: 'bg-[var(--surface-3)] border-[var(--border)]',
          icon: <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />,
          text: 'text-[var(--warning)]',
          link: 'text-[var(--warning)] hover:opacity-90',
        };
      case 'critical':
        return {
          bg: 'bg-[var(--surface-3)] border-[var(--border)]',
          icon: <AlertCircle className="w-5 h-5 text-[var(--danger)]" />,
          text: 'text-[var(--danger)]',
          link: 'text-[var(--danger)] hover:opacity-90',
        };
      default: // info
        return {
          bg: 'bg-[var(--surface-3)] border-[var(--border)]',
          icon: <Info className="w-5 h-5 text-[var(--blue)]" />,
          text: 'text-[var(--blue)]',
          link: 'text-[var(--blue)] hover:text-[var(--blue-hover)]',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} border-b border-t p-4`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${styles.text}`}>
              <strong>{title}</strong>
              {message && <span className="ml-1">{message}</span>}
            </p>
            {linkText && onLinkClick && (
              <button
                onClick={onLinkClick}
                className={`text-sm ${styles.link} underline mt-1`}
              >
                {linkText}
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 p-1 rounded hover:bg-[var(--surface-2)] transition-colors ${styles.text}`}
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
