import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle,
  TrendingUp,
  CheckCheck,
  Image,
  Mail,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import type { User } from '../../App';
import { getMyNotifications, setNotificationReadState } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';

interface NotificationsListProps {
  user?: User;
  onNavigate?: (page: string) => void;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  artworkId?: string | null;
  orderId?: string | null;
}

function resolveTarget(n: NotificationItem, isArtist: boolean): string {
  switch (n.type) {
    case 'artwork_sold':
      return isArtist ? 'artist-sales' : 'venue-sales';
    case 'artwork_approved':
    case 'artwork_rejected':
      return 'artist-artworks';
    case 'application_received':
    case 'application_submitted':
      return isArtist ? 'artist-applications' : 'venue-applications';
    case 'venue_invite':
    case 'venue_invite_question':
      return 'artist-invites';
    case 'install_scheduled':
    case 'pickup_scheduled':
    case 'install_reminder':
    case 'pickup_reminder':
      return isArtist ? 'artist-applications' : 'venue-current';
    case 'payout_sent':
    case 'payout_failed':
      return isArtist ? 'artist-sales' : 'venue-sales';
    default:
      return isArtist ? 'artist-dashboard' : 'venue-dashboard';
  }
}

function ctaLabel(type: string): string {
  switch (type) {
    case 'artwork_sold':
      return 'View sale';
    case 'artwork_approved':
      return 'View artwork';
    case 'application_received':
      return 'Review application';
    case 'application_submitted':
      return 'View application';
    case 'venue_invite':
      return 'View invitation';
    case 'install_scheduled':
    case 'pickup_scheduled':
      return 'View schedule';
    case 'install_reminder':
    case 'pickup_reminder':
      return 'View details';
    case 'payout_sent':
      return 'View earnings';
    default:
      return 'View details';
  }
}

function getIcon(type: string) {
  switch (type) {
    case 'artwork_sold':
    case 'payout_sent':
      return <TrendingUp className="w-5 h-5 text-[var(--green)]" />;
    case 'artwork_approved':
    case 'application_approved':
      return <CheckCircle className="w-5 h-5 text-[var(--green)]" />;
    case 'install_scheduled':
    case 'pickup_scheduled':
    case 'install_reminder':
    case 'pickup_reminder':
      return <Calendar className="w-5 h-5 text-[var(--blue)]" />;
    case 'application_received':
    case 'application_submitted':
      return <Image className="w-5 h-5 text-[var(--blue)]" />;
    case 'venue_invite':
    case 'venue_invite_question':
      return <Mail className="w-5 h-5 text-[var(--accent)]" />;
    case 'payout_failed':
      return <CreditCard className="w-5 h-5 text-[var(--danger)]" />;
    default:
      return <Bell className="w-5 h-5 text-[var(--text-muted)]" />;
  }
}

export function NotificationsList({ user, onNavigate }: NotificationsListProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isArtist = user?.role === 'artist';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { notifications } = await getMyNotifications(user.id, user.role || '');
      const mapped: NotificationItem[] = (notifications || []).map((n) => ({
        id: n.id,
        type: n.type || 'general',
        title: n.title,
        message: n.message || '',
        createdAt: n.createdAt,
        isRead: !!n.isRead,
        artworkId: n.artworkId,
        orderId: n.orderId,
      }));
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string, currentRead: boolean) => {
    const nextRead = !currentRead;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: nextRead } : i)));
    try {
      await setNotificationReadState(id, nextRead);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: currentRead } : i)));
    }
  };

  const handleMarkAllRead = async () => {
    const unread = items.filter((i) => !i.isRead);
    if (!unread.length) return;
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    for (const n of unread) {
      try {
        await setNotificationReadState(n.id, true);
      } catch {
        /* best-effort */
      }
    }
  };

  const handleCta = (n: NotificationItem) => {
    // Mark as read and navigate
    if (!n.isRead) {
      handleMarkRead(n.id, false);
    }
    const target = resolveTarget(n, !!isArtist);
    onNavigate?.(target);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  const grouped = {
    today: items.filter((n) => {
      const diffDays = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 86400000);
      return diffDays === 0;
    }),
    earlier: items.filter((n) => {
      const diffDays = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 86400000);
      return diffDays > 0;
    }),
  };

  const renderCard = (n: NotificationItem) => (
    <div
      key={n.id}
      className={`bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4 sm:p-5 hover:shadow-md transition-shadow ${
        !n.isRead ? 'border-l-4 border-l-[var(--blue)]' : ''
      }`}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-[var(--surface-2)] rounded-lg flex items-center justify-center">
          {getIcon(n.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-base text-[var(--text)] font-medium">
              {n.title}
              {!n.isRead && (
                <span className="ml-2 inline-block w-2 h-2 bg-[var(--blue)] rounded-full" />
              )}
            </h3>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {formatTimestamp(n.createdAt)}
            </span>
          </div>
          {n.message && <p className="text-sm text-[var(--text-muted)] mb-3">{n.message}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCta(n)}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline"
            >
              {ctaLabel(n.type)}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleMarkRead(n.id, n.isRead)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {n.isRead ? 'Mark unread' : 'Mark read'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        title="Notifications"
        subtitle={loading ? 'Loading…' : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
              }}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          ) : undefined
        }
      />

      <div className="max-w-3xl space-y-8">
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--blue)] mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)]">Loading notifications…</p>
          </div>
        )}

        {!loading && grouped.today.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Today</h2>
            <div className="space-y-2">{grouped.today.map(renderCard)}</div>
          </div>
        )}

        {!loading && grouped.earlier.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Earlier</h2>
            <div className="space-y-2">{grouped.earlier.map(renderCard)}</div>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">All caught up!</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              You'll see notifications here when there's activity on your account.
            </p>
            <button
              onClick={() => onNavigate?.(isArtist ? 'artist-dashboard' : 'venue-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] text-sm font-medium transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
