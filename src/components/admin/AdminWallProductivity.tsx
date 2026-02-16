import { useEffect, useState } from 'react';
import { BarChart3, ArrowDownRight, ArrowUpRight, QrCode, Eye, ShoppingCart, DollarSign } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';

interface FunnelVenue {
  venue_id: string;
  venue_name: string | null;
  scans: number;
  views: number;
  checkout_starts: number;
  purchases: number;
}

interface TopArtwork {
  artwork_id: string;
  artwork_title: string | null;
  artist_name: string | null;
  scans: number;
  views: number;
  checkout_starts: number;
  purchases: number;
}

interface WallMetrics {
  period_days: number;
  since: string;
  total_scans: number;
  total_artwork_views: number;
  total_checkout_starts: number;
  total_purchases: number;
  scans_by_venue: Array<{ venue_id: string; venue_name: string | null; scans: number }>;
  top_artworks: TopArtwork[];
  funnel_by_venue: FunnelVenue[];
}

interface AdminWallProductivityProps {
  onNavigate?: (page: string, params?: any) => void;
}

export function AdminWallProductivity({ onNavigate }: AdminWallProductivityProps) {
  const [metrics, setMetrics] = useState<WallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<WallMetrics>(`/api/admin/wall-productivity?days=${days}`);
        if (mounted) setMetrics(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load metrics');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [days]);

  function pct(numerator: number, denominator: number): string {
    if (!denominator) return '0%';
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Loading wall productivity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 bg-[var(--danger-muted)] border border-[var(--danger)] text-[var(--danger)] p-4 rounded-lg">
        <p className="font-semibold mb-1">Failed to load wall productivity</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  const funnelKpis = [
    {
      label: 'QR Scans',
      value: metrics.total_scans,
      icon: QrCode,
      iconColor: 'text-[var(--blue)]',
    },
    {
      label: 'Artwork Views',
      value: metrics.total_artwork_views,
      icon: Eye,
      iconColor: 'text-[var(--text-muted)]',
    },
    {
      label: 'Checkout Starts',
      value: metrics.total_checkout_starts,
      icon: ShoppingCart,
      iconColor: 'text-[var(--warning)]',
    },
    {
      label: 'Purchases',
      value: metrics.total_purchases,
      icon: DollarSign,
      iconColor: 'text-[var(--green)]',
    },
  ];

  return (
    <div className="bg-[var(--bg)]">
      {/* Header */}
      <PageHeroHeader
        title="Wall Productivity"
        subtitle="Core funnel: QR scans → artwork views → checkout → purchase"
        actions={
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  days === d
                    ? 'bg-[var(--blue)] text-[var(--on-blue)] border-transparent'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-3)]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {/* Funnel KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {funnelKpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const prev = idx > 0 ? funnelKpis[idx - 1].value : null;
          const conversion = prev != null && prev > 0
            ? `${((kpi.value / prev) * 100).toFixed(1)}% of ${funnelKpis[idx - 1].label.toLowerCase()}`
            : null;
          return (
            <div
              key={kpi.label}
              className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="text-sm text-[var(--text-muted)] mb-1">{kpi.label}</div>
              <div className="text-2xl mb-2 text-[var(--text)]">{kpi.value.toLocaleString()}</div>
              {conversion && (
                <div className="text-xs text-[var(--text-muted)]">{conversion}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conversion summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-[var(--warning)]" />
            <span className="text-sm text-[var(--text-muted)]">Scan → Checkout Start</span>
          </div>
          <div className="text-3xl text-[var(--text)]">
            {pct(metrics.total_checkout_starts, metrics.total_scans)}
          </div>
        </div>
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-[var(--green)]" />
            <span className="text-sm text-[var(--text-muted)]">Checkout Start → Purchase</span>
          </div>
          <div className="text-3xl text-[var(--text)]">
            {pct(metrics.total_purchases, metrics.total_checkout_starts)}
          </div>
        </div>
      </div>

      {/* Funnel by Venue */}
      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] mb-8">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl text-[var(--text)]">Scans by Venue (last {days} days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-[var(--text-muted)] font-medium">Venue</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Scans</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Views</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Checkouts</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Purchases</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Scan→Checkout</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Checkout→Purchase</th>
              </tr>
            </thead>
            <tbody>
              {metrics.funnel_by_venue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--text-muted)]">
                    No venue data yet for this period.
                  </td>
                </tr>
              ) : (
                metrics.funnel_by_venue.map((v) => (
                  <tr key={v.venue_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
                    <td className="p-4 text-[var(--text)]">{v.venue_name || v.venue_id?.slice(0, 8)}</td>
                    <td className="p-4 text-right text-[var(--text)]">{v.scans}</td>
                    <td className="p-4 text-right text-[var(--text)]">{v.views}</td>
                    <td className="p-4 text-right text-[var(--text)]">{v.checkout_starts}</td>
                    <td className="p-4 text-right text-[var(--text)]">{v.purchases}</td>
                    <td className="p-4 text-right text-[var(--text-muted)]">{pct(v.checkout_starts, v.scans)}</td>
                    <td className="p-4 text-right text-[var(--text-muted)]">{pct(v.purchases, v.checkout_starts)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Artworks */}
      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-xl text-[var(--text)]">Top Artworks by Scans (last {days} days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-[var(--text-muted)] font-medium">Artwork</th>
                <th className="text-left p-4 text-[var(--text-muted)] font-medium">Artist</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Scans</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Views</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Checkouts</th>
                <th className="text-right p-4 text-[var(--text-muted)] font-medium">Purchases</th>
              </tr>
            </thead>
            <tbody>
              {metrics.top_artworks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">
                    No artwork data yet for this period.
                  </td>
                </tr>
              ) : (
                metrics.top_artworks.map((a) => (
                  <tr key={a.artwork_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
                    <td className="p-4 text-[var(--text)]">{a.artwork_title || a.artwork_id?.slice(0, 8)}</td>
                    <td className="p-4 text-[var(--text-muted)]">{a.artist_name || '—'}</td>
                    <td className="p-4 text-right text-[var(--text)]">{a.scans}</td>
                    <td className="p-4 text-right text-[var(--text)]">{a.views}</td>
                    <td className="p-4 text-right text-[var(--text)]">{a.checkout_starts}</td>
                    <td className="p-4 text-right text-[var(--text)]">{a.purchases}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
