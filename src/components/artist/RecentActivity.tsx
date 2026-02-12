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

function iconColorForType(type: string) {
  switch (type) {
    case 'artwork_approved':
      return { bg: 'bg-[var(--green-muted)]', fg: 'text-[var(--green)]' };
    case 'purchase':
      return { bg: 'bg-[var(--green-muted)]', fg: 'text-[var(--green)]' };
    default:
      return { bg: 'bg-[var(--blue-muted)]', fg: 'text-[var(--blue)]' };
  }
}

export function RecentActivity({ userId, onNavigate }: RecentActivityProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, type, title, message, created_at, read')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(8);
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
  }, [userId]);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text)] leading-none">
            Recent Activity
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-normal mt-1.5">
            Latest updates on your artwork
          </p>
        </div>
        {items.length > 0 && (
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </div>

      {loading ? (
        /* Skeleton */
        <div className="px-5 py-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-[var(--skeleton)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[var(--skeleton)] rounded w-3/4" />
                <div className="h-3 bg-[var(--skeleton)] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="px-5 py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center mx-auto mb-4">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text)] leading-normal">
            No activity yet
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1.5 max-w-xs mx-auto">
            Upload artwork → generate a QR code → place it at a venue → watch scans and sales roll in.
          </p>
          <button
            onClick={() => onNavigate('artist-artworks')}
            className="mt-4 text-sm text-[var(--blue)] hover:underline font-medium"
          >
            Upload your first artwork →
          </button>
        </div>
      ) : (
        /* Activity rows */
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => {
            const Icon = iconForType[item.type] || Bell;
            const colors = iconColorForType(item.type);
            return (
              <div
                key={item.id}
                className="px-5 py-4 flex items-start gap-3.5"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                >
                  <Icon className={`w-4 h-4 ${colors.fg}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--text)] leading-normal">
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="text-xs text-[var(--text-muted)] leading-normal mt-0.5 line-clamp-1">
                      {item.message}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 pt-0.5 leading-normal">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
