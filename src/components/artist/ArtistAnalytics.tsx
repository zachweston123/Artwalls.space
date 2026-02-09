import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, ShoppingBag, DollarSign, BarChart3 } from 'lucide-react';
import type { User } from '../../App';

type TimeRange = '7d' | '30d' | '90d';

interface SummaryCard {
  orders: number;
  revenueCents: number;
  earningsCents: number;
  conversionPct: number;
}

interface ArtworkRow {
  artworkId: string;
  title: string;
  orders: number;
  revenueCents: number;
  earningsCents: number;
}

interface ArtistAnalyticsProps {
  user: User;
}

export function ArtistAnalytics({ user }: ArtistAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<SummaryCard>({ orders: 0, revenueCents: 0, earningsCents: 0, conversionPct: 0 });
  const [topArtworks, setTopArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeDays: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const rangeLabels: Record<TimeRange, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const days = rangeDays[range];
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch orders for this artist in the time range
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, artwork_id, amount_cents, artist_payout_cents, created_at')
        .eq('artist_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (ordersErr) throw new Error(ordersErr.message);

      const orderList = orders || [];
      const totalOrders = orderList.length;
      const totalRevenue = orderList.reduce((s, o) => s + (o.amount_cents || 0), 0);
      const totalEarnings = orderList.reduce((s, o) => s + (o.artist_payout_cents || 0), 0);

      // Fetch scan/view events for conversion calculation
      let conversionPct = 0;
      try {
        const { count: viewCount } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('event_type', ['view_artwork', 'qr_scan'])
          .gte('created_at', since);

        if (viewCount && viewCount > 0 && totalOrders > 0) {
          conversionPct = Math.round((totalOrders / viewCount) * 100);
        }
      } catch {
        // events table may not have data yet — that's fine
      }

      setSummary({ orders: totalOrders, revenueCents: totalRevenue, earningsCents: totalEarnings, conversionPct });

      // Build per-artwork breakdown
      const artworkMap = new Map<string, { orders: number; revenueCents: number; earningsCents: number }>();
      for (const o of orderList) {
        const aid = o.artwork_id || 'unknown';
        const existing = artworkMap.get(aid) || { orders: 0, revenueCents: 0, earningsCents: 0 };
        existing.orders += 1;
        existing.revenueCents += o.amount_cents || 0;
        existing.earningsCents += o.artist_payout_cents || 0;
        artworkMap.set(aid, existing);
      }

      // Fetch artwork titles
      const artworkIds = [...artworkMap.keys()].filter(id => id !== 'unknown');
      let titleMap = new Map<string, string>();
      if (artworkIds.length > 0) {
        const { data: artworks } = await supabase
          .from('artworks')
          .select('id, title')
          .in('id', artworkIds);
        for (const a of artworks || []) {
          titleMap.set(a.id, a.title || 'Untitled');
        }
      }

      const rows: ArtworkRow[] = [...artworkMap.entries()]
        .map(([artworkId, stats]) => ({
          artworkId,
          title: titleMap.get(artworkId) || artworkId.slice(0, 8) + '…',
          ...stats,
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);

      setTopArtworks(rows);
    } catch (err: any) {
      setError(err?.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user.id, range]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (cents: number) => {
    const dollars = cents / 100;
    return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-2">Analytics</h1>
        <p className="text-sm text-[var(--text-muted)]">Track your sales performance and artwork engagement.</p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              range === r
                ? 'bg-[var(--blue)] text-[var(--on-blue)] shadow-sm'
                : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]'
            }`}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--blue)]" />
          <span className="ml-3 text-sm text-[var(--text-muted)]">Loading analytics…</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6 text-center">
          <p className="text-sm text-[var(--danger)] mb-3">{error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors shadow-sm">
            Retry
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5">
              <div className="w-10 h-10 bg-[color:color-mix(in_srgb,var(--blue)_12%,transparent)] rounded-md flex items-center justify-center mb-3">
                <ShoppingBag className="w-5 h-5 text-[var(--blue)]" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Orders</p>
              <p className="text-2xl font-bold">{summary.orders}</p>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5">
              <div className="w-10 h-10 bg-[color:color-mix(in_srgb,var(--green)_12%,transparent)] rounded-md flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-[var(--green)]" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Revenue</p>
              <p className="text-2xl font-bold">{fmt(summary.revenueCents)}</p>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5">
              <div className="w-10 h-10 bg-[color:color-mix(in_srgb,var(--green)_12%,transparent)] rounded-md flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-[var(--green)]" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Your Earnings</p>
              <p className="text-2xl font-bold">{fmt(summary.earningsCents)}</p>
            </div>

            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5">
              <div className="w-10 h-10 bg-[color:color-mix(in_srgb,var(--blue)_12%,transparent)] rounded-md flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-[var(--blue)]" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Conversion</p>
              <p className="text-2xl font-bold">{summary.conversionPct}%</p>
            </div>
          </div>

          {/* Top Artworks Table */}
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5">
            <h2 className="text-lg font-bold text-[var(--text)] mb-1">Top Artworks</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">Your best-performing pieces by sales in the selected period.</p>

            {topArtworks.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingBag className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">No sales data yet for this period.</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Sales will appear here once buyers purchase your artwork.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Artwork</th>
                      <th className="text-right py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Orders</th>
                      <th className="text-right py-2 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Revenue</th>
                      <th className="text-right py-2 pl-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topArtworks.map((row) => (
                      <tr key={row.artworkId} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="py-3 pr-4 font-medium">{row.title}</td>
                        <td className="py-3 px-4 text-right text-[var(--text-muted)]">{row.orders}</td>
                        <td className="py-3 px-4 text-right text-[var(--text-muted)]">{fmt(row.revenueCents)}</td>
                        <td className="py-3 pl-4 text-right font-medium text-[var(--green)]">{fmt(row.earningsCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
