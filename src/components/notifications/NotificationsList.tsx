import { useEffect, useState } from 'react';
import { Bell, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { mockNotifications } from '../../data/mockData';
import type { Notification } from '../../data/mockData';
import { getMyNotifications } from '../../lib/api';

export function NotificationsList() {
  const [items, setItems] = useState<typeof mockNotifications>(mockNotifications);
  useEffect(() => {
    getMyNotifications().then(({ notifications }) => {
      if (notifications && notifications.length) {
        const mapped = notifications.map(n => ({
          id: n.id,
          type: (n.type as Notification['type']) || 'install-scheduled',
          title: n.title,
          message: n.message || '',
          timestamp: n.createdAt,
          isRead: n.isRead || false,
        }));
        setItems(mapped as any);
      }
    }).catch(() => {});
  }, []);
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'application-approved':
        return <CheckCircle className="w-5 h-5 text-[var(--green)]" />;
      case 'install-scheduled':
      case 'pickup-scheduled':
        return <Calendar className="w-5 h-5 text-[var(--blue)]" />;
      case 'install-reminder':
      case 'pickup-reminder':
        return <Bell className="w-5 h-5 text-[var(--warning)]" />;
      case 'artwork-sold':
        return <TrendingUp className="w-5 h-5 text-[var(--blue)]" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--text-muted)]" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const groupedNotifications = {
    today: items.filter(n => {
      const diffDays = Math.floor((new Date().getTime() - new Date(n.timestamp).getTime()) / 86400000);
      return diffDays === 0;
    }),
    earlier: items.filter(n => {
      const diffDays = Math.floor((new Date().getTime() - new Date(n.timestamp).getTime()) / 86400000);
      return diffDays > 0;
    }),
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">Notifications</h1>
        <p className="text-[var(--text-muted)]">
          {items.filter(n => !n.isRead).length} unread notifications
        </p>
      </div>

      <div className="max-w-3xl space-y-8">
        {/* Today */}
        {groupedNotifications.today.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-[var(--text-muted)] mb-3">Today</h2>
            <div className="space-y-2">
              {groupedNotifications.today.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4 sm:p-5 hover:shadow-md transition-shadow ${
                    !notification.isRead ? 'bg-[var(--surface-2)]' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base text-[var(--text)]">
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-[var(--blue)] rounded-full"></span>
                          )}
                        </h3>
                        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{notification.message}</p>
                      {notification.ctaLabel && (
                        <button className="text-sm text-[var(--blue)] hover:opacity-90 underline">
                          {notification.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Earlier */}
        {groupedNotifications.earlier.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-[var(--text-muted)] mb-3">Earlier</h2>
            <div className="space-y-2">
              {groupedNotifications.earlier.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4 sm:p-5 hover:shadow-md transition-shadow ${
                    !notification.isRead ? 'bg-[var(--surface-2)]' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-lg text-[var(--text)]">
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-[var(--blue)] rounded-full"></span>
                          )}
                        </h3>
                        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{notification.message}</p>
                      {notification.ctaLabel && (
                        <button className="text-sm text-[var(--blue)] hover:opacity-90 underline">
                          {notification.ctaLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl mb-2 text-[var(--text)]">No notifications</h3>
            <p className="text-[var(--text-muted)]">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
