import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';

interface VenueAnalyticsProps {
  user: User;
}

export function VenueAnalytics({ user }: VenueAnalyticsProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiGet(`/api/analytics/venue?venueId=${encodeURIComponent(user.id)}`);
        setData(res || {});
      } catch (err: any) {
        setError(err?.message || 'Unable to load analytics');
        setData(null);
      }
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading analytics…</p>;
  }

  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-2xl mb-4">Venue Analytics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Scans (7 days)</p>
          <p className="text-2xl">{data?.cards?.scansWeek ?? 0}</p>
        </div>
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Scans (30 days)</p>
          <p className="text-2xl">{data?.cards?.scansMonth ?? 0}</p>
        </div>
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Checkout → Purchase</p>
          <p className="text-2xl">{data?.cards?.conversion ?? 0}%</p>
        </div>
      </div>

      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm mb-3">Top Artworks</h2>
        <div className="space-y-2 text-sm">
          {data?.perArtwork ? (
            Object.entries(data.perArtwork).map(([id, stats]: any) => (
              <div key={id} className="flex justify-between">
                <span className="text-[var(--text-muted)]">{id.slice(0, 8)}</span>
                <span>Scans {stats.scans} • Purchases {stats.purchases}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
