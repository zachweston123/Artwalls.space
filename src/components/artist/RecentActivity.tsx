import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Image,
  QrCode,
  ShoppingBag,
  Bell,
  Calendar,
  Truck,
  Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '../ui/card';

/**
 * RecentActivity — lightweight activity feed for the artist dashboard.
 *
 * Data source: `notifications` table (already written to by the Cloudflare
 * Worker for events like artwork_approved, install-scheduled, etc.).
 *
 * Falls back to a helpful empty-state if no rows exist or the query fails
 * (e.g., table missing, RLS blocks, etc.).
 */

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  created_at: string;
  read: boolean;
}

interface RecentActivityProps {
  userId: string;
  onNavigate: (page: string) => void;
  /** When true, shows a compact version for sidebar use (fewer items, tighter spacing) */
  compact?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const iconForType: Record<string, typeof Bell> = {
  artwork_approved: CheckCircle2,
  'install-scheduled': Calendar,
  'pickup-scheduled': Truck,
  purchase: ShoppingBag,
  qr_scan: QrCode,
  view_artwork: Image,
};

export function RecentActivity({ userId, onNavigate, compact = false }: RecentActivityProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const maxItems = compact ? 5 : 8;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, type, title, message, created_at, read')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(maxItems);
        if (!mounted) return;
        if (error) throw error;
        setItems((data as ActivityItem[]) || []);
      } catch {
        // Table may not exist or RLS blocks — degrade gracefully
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [userId, maxItems]);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <Card className="bg-[var(--surface-2)] border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--text)]">
          Recent Activity
        </CardTitle>
        {!compact && (
          <CardDescription className="text-sm text-[var(--text-muted)]">
            Latest updates on your artwork
          </CardDescription>
        )}
        {items.length > 0 && (
          <CardAction>
            <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          /* Skeleton */
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-[var(--skeleton)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[var(--skeleton)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--skeleton)] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">
              No activity yet
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1 max-w-xs mx-auto">
              {compact
                ? 'Activity will appear here as you use the platform.'
                : 'Upload artwork, generate a QR code, place it at a venue — watch scans and sales roll in.'}
            </p>
            {!compact && (
              <button
                onClick={() => onNavigate('artist-artworks')}
                className="mt-4 text-sm font-medium text-[var(--blue)] hover:underline"
              >
                Upload your first artwork →
              </button>
            )}
          </div>
        ) : (
          /* Activity rows — all neutral icons */
          <>
            <div className="divide-y divide-[var(--border)]">
              {items.map((item) => {
                const Icon = iconForType[item.type] || Bell;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 ${compact ? 'py-3' : 'py-4'} first:pt-0 last:pb-0`}
                  >
                    <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-[var(--surface-3)] flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-[var(--text-muted)]`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${compact ? 'text-xs' : 'text-sm'} text-[var(--text)] leading-snug`}>
                        {item.title}
                      </p>
                      {!compact && item.message && (
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 line-clamp-1">
                          {item.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] flex-shrink-0 pt-0.5">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
            {compact && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <button
                  onClick={() => onNavigate('artist-performance')}
                  className="text-xs font-medium text-[var(--blue)] hover:underline"
                >
                  View all activity →
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
