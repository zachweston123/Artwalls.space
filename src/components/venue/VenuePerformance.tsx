/**
 * VenuePerformance — weekly/monthly scan performance snapshot.
 * Fetches from GET /api/venues/me/performance?range=7d|30d
 * Shows scan counts by day, top artworks, and a link to the full statement.
 */

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, QrCode, Eye, ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';
import { StatCard } from '../ui/stat-card';

interface VenuePerformanceProps {
  user: { id: string; name: string };
  onNavigate: (page: string) => void;
}

interface PerformanceData {
  totalScans: number;
  totalViews: number;
  totalCheckouts: number;
  totalPurchases: number;
  scansByDay: { date: string; count: number }[];
  topArtworks: { artworkId: string; title: string; scans: number }[];
}

export function VenuePerformance({ user, onNavigate }: VenuePerformanceProps) {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiGet<PerformanceData>(`/api/venues/me/performance?range=${range}`);
      setData(resp);
    } catch (err) {
      console.error('Failed to load performance', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const maxScans = data ? Math.max(...data.scansByDay.map(d => d.count), 1) : 1;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        breadcrumb="Dashboard / Performance"
        title="Performance snapshot"
        subtitle="QR scans, views, and checkout activity"
        actions={
          <>
            <button
              onClick={() => onNavigate('venue-statement')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]"
            >
              Monthly statement
            </button>
            <button
              onClick={() => onNavigate('venue-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </>
        }
      />

      {/* Range Toggle */}
      <div className="flex gap-2 mb-6">
        {(['7d', '30d'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              range === r
                ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                : 'bg-[var(--surface-1)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {r === '7d' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : !data ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Unable to load performance data.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="QR Scans"
              value={data.totalScans}
              icon={<QrCode className="w-5 h-5" />}
              accent="green"
            />
            <StatCard
              label="Art Views"
              value={data.totalViews}
              icon={<Eye className="w-5 h-5" />}
              accent="blue"
            />
            <StatCard
              label="Checkouts"
              value={data.totalCheckouts}
              icon={<ShoppingCart className="w-5 h-5" />}
              accent="violet"
            />
            <StatCard
              label="Purchases"
              value={data.totalPurchases}
              icon={<TrendingUp className="w-5 h-5" />}
              accent="amber"
            />
          </div>

          {/* Scans by Day — simple bar chart */}
          <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-8">
            <h2 className="text-lg font-semibold mb-4 text-[var(--text)]">Scans by day</h2>
            {data.scansByDay.length > 0 ? (
              <div className="flex items-end gap-1 h-40">
                {data.scansByDay.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">{d.count || ''}</span>
                    <div
                      className="w-full bg-green-500 rounded-t-sm min-h-[2px] transition-all"
                      style={{ height: `${Math.max((d.count / maxScans) * 100, 2)}%` }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No scan data for this period.</p>
            )}
          </div>

          {/* Top Artworks */}
          {data.topArtworks.length > 0 && (
            <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4 text-[var(--text)]">Top artworks by scans</h2>
              <div className="space-y-3">
                {data.topArtworks.map((art, i) => (
                  <div key={art.artworkId} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--text-muted)] w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{art.title || art.artworkId}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{art.scans} scans</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
