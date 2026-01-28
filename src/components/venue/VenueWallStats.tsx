import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';

interface VenueWallStatsProps {
  user: User;
}

export function VenueWallStats({ user }: VenueWallStatsProps) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await apiGet(`/api/analytics/venue?venueId=${encodeURIComponent(user.id)}`);
      setData(res);
    })();
  }, [user.id]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl mb-4">Today's Wall Stats</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">Scans (7 days)</p>
          <p className="text-4xl">{data?.cards?.scansWeek ?? 0}</p>
        </div>
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">Scans (30 days)</p>
          <p className="text-4xl">{data?.cards?.scansMonth ?? 0}</p>
        </div>
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">Checkout → Purchase</p>
          <p className="text-4xl">{data?.cards?.conversion ?? 0}%</p>
        </div>
      </div>
    </div>
  );
}
