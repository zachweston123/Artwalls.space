import { useEffect, useState } from 'react';
import { CalendarDays, QrCode, TrendingUp } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';
import { PageShell } from '../ui/page-shell';
import { SectionCard } from '../ui/section-card';
import { StatCard } from '../ui/stat-card';

interface WallStatsData {
  cards: {
    scansWeek: number;
    scansMonth: number;
    conversion: number;
  };
}

interface VenueWallStatsProps {
  user: User;
}

export function VenueWallStats({ user }: VenueWallStatsProps) {
  const [data, setData] = useState<WallStatsData | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiGet(`/api/analytics/venue?venueId=${encodeURIComponent(user.id)}`);
      setData(res);
    })();
  }, [user.id]);

  return (
    <PageShell size="default" className="text-[var(--text)]">
      <SectionCard
        title="Today's Wall Stats"
        subtitle="Rolling engagement and conversion across your venue."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Scans (7 days)"
            value={data?.cards?.scansWeek ?? 0}
            icon={<QrCode className="w-5 h-5" />}
            accent="violet"
            className="sm:p-6"
          />
          <StatCard
            label="Scans (30 days)"
            value={data?.cards?.scansMonth ?? 0}
            icon={<CalendarDays className="w-5 h-5" />}
            accent="blue"
            className="sm:p-6"
          />
          <StatCard
            label="Checkout → Purchase"
            value={`${data?.cards?.conversion ?? 0}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="green"
            className="sm:p-6"
          />
        </div>
      </SectionCard>
    </PageShell>
  );
}
