import { Bell, Calendar, CheckCircle, Package, TrendingUp } from 'lucide-react';
import { mockNotifications } from '../../data/mockData';
import type { Notification } from '../../data/mockData';

export function NotificationsList() {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'application-approved':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'install-scheduled':
      case 'pickup-scheduled':
        return <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'install-reminder':
      case 'pickup-reminder':
        return <Bell className="w-5 h-5 text-orange-600" />;
      case 'artwork-sold':
        return <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />;
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
    today: mockNotifications.filter(n => {
      const diffDays = Math.floor((new Date().getTime() - new Date(n.timestamp).getTime()) / 86400000);
      return diffDays === 0;
    }),
    earlier: mockNotifications.filter(n => {
      const diffDays = Math.floor((new Date().getTime() - new Date(n.timestamp).getTime()) / 86400000);
      return diffDays > 0;
    }),
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Notifications</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          {mockNotifications.filter(n => !n.isRead).length} unread notifications
        </p>
      </div>

      <div className="max-w-3xl space-y-8">
        {/* Today */}
        {groupedNotifications.today.length > 0 && (
          <div>
            <h2 className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Today</h2>
            <div className="space-y-2">
              {groupedNotifications.today.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 hover:shadow-md transition-shadow ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/30/30' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base text-neutral-900 dark:text-neutral-50">
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h3>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">{notification.message}</p>
                      {notification.ctaLabel && (
                        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 underline">
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
            <h2 className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Earlier</h2>
            <div className="space-y-2">
              {groupedNotifications.earlier.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 hover:shadow-md transition-shadow ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/30/30' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base text-neutral-900 dark:text-neutral-50">
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h3>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">{notification.message}</p>
                      {notification.ctaLabel && (
                        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 underline">
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
        {mockNotifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-xl mb-2 text-neutral-900 dark:text-neutral-50">No notifications</h3>
            <p className="text-neutral-600 dark:text-neutral-300">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
