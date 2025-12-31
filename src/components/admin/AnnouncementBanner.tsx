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
          bg: 'bg-green-50 border-green-200',
          icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
          text: 'text-green-900 dark:text-green-200',
          link: 'text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
          text: 'text-orange-900 dark:text-orange-200',
          link: 'text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200',
        };
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
          text: 'text-red-900 dark:text-red-200',
          link: 'text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200',
        };
      default: // info
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          text: 'text-blue-900 dark:text-blue-200',
          link: 'text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200',
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
              className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${styles.text}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
