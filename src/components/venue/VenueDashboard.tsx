import { Frame, Users, DollarSign, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';
import { VenuePayoutsCard } from './VenuePayoutsCard';
import { PageHeader } from '../PageHeader';
import { formatCurrency, formatRatioOrCount } from '../../utils/format';
import { EmptyState } from '../EmptyState';
import { VenueSetupChecklist } from '../VenueSetupChecklist';
import { VenueNextActions } from './VenueNextActions';
import { StatCard } from '../ui/stat-card';

interface VenueDashboardProps {
  onNavigate: (page: string) => void;
  user?: User;
  hasAcceptedAgreement?: boolean | null;
}

export function VenueDashboard({ onNavigate, user, hasAcceptedAgreement }: VenueDashboardProps) {
  const [stats, setStats] = useState<{
    walls: { total: number; occupied: number; available: number };
    applications: { pending: number };
    sales: { total: number; totalEarnings: number };
  } | null>(null);
  const [payoutsConnected, setPayoutsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      if (!user?.id) return;
      try {
        const s = await apiGet<{
          venueId: string;
          walls: { total: number; occupied: number; available: number };
          applications: { pending: number };
          sales: { total: number; totalEarnings: number };
        }>(`/api/stats/venue?venueId=${user.id}`);
        if (!isMounted) return;
        setStats({
          walls: s.walls,
          applications: s.applications,
          sales: s.sales,
        });
      } catch {
        if (!isMounted) return;
        setStats(null);
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    async function loadPayouts() {
      if (!user?.id) return;
      try {
        const data = await apiGet<{ hasAccount?: boolean; payoutsEnabled?: boolean }>(
          `/api/stripe/connect/venue/status?userId=${encodeURIComponent(user.id)}`
        );
        if (!isMounted) return;
        setPayoutsConnected(!!data?.payoutsEnabled);
      } catch {
        if (!isMounted) return;
        setPayoutsConnected(false);
      }
    }
    loadPayouts();
    return () => { isMounted = false; };
  }, [user?.id]);

  const totalWalls = stats?.walls?.total ?? 0;
  const availableWalls = stats?.walls?.available ?? 0;
  const occupiedWalls = Math.max(0, totalWalls - availableWalls);
  const pendingApplications = stats?.applications?.pending ?? 0;
  const venueEarnings = stats?.sales?.totalEarnings ?? 0;

  const wallRatioLabel = formatRatioOrCount(occupiedWalls, totalWalls, { zeroLabel: '0 wall spaces' });

  const venueStats = [
    {
      label: 'Wall Spaces',
      value: wallRatioLabel,
      subtext: 'Currently occupied',
      icon: Frame,
      color: 'green',
      action: () => onNavigate('venue-walls'),
    },
    {
      label: 'Pending Applications',
      value: pendingApplications,
      subtext: 'Awaiting your review',
      icon: Clock,
      color: 'green',
      action: () => onNavigate('venue-applications'),
    },
    {
      label: 'Active displays',
      value: occupiedWalls,
      subtext: 'Art currently on your walls',
      icon: Users,
      color: 'green',
      action: () => onNavigate('venue-current'),
    },
    {
      label: 'Total Earnings',
      value: formatCurrency(venueEarnings),
      subtext: '15% commission share',
      icon: DollarSign,
      color: 'green',
      action: () => onNavigate('venue-sales'),
    },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeader
        breadcrumb="Manage / Dashboard"
        title="Venue dashboard"
        subtitle="Track wall spaces, applications, and payouts"
        primaryAction={{ label: 'Add Wall Space', onClick: () => onNavigate('venue-walls') }}
        secondaryAction={{ label: 'Find Artists', onClick: () => onNavigate('venue-find-artists') }}
        className="mb-6"
      />

      {user && (
        <div className="mb-6">
          <VenuePayoutsCard user={user} />
        </div>
      )}

      {user && (
        <div className="mb-8">
          <VenueSetupChecklist user={user} stats={stats || undefined} onNavigate={onNavigate} hasAcceptedAgreement={hasAcceptedAgreement} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        {venueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              subtext={stat.subtext}
              icon={<Icon className="w-5 h-5" />}
              accent="green"
              onClick={stat.action}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <VenueNextActions
            hasWalls={totalWalls > 0}
            pendingApplications={pendingApplications}
            payoutsConnected={payoutsConnected}
            onNavigate={onNavigate}
          />
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text)]">Recent Activity</h2>
          <EmptyState
            title="No recent activity yet"
            description="Once you review applications or add wall spaces, activity will show up here."
            icon={<Clock className="w-6 h-6" />}
            primaryAction={{ label: 'Complete profile', onClick: () => onNavigate('venue-profile') }}
            secondaryAction={{ label: 'Add wall space', onClick: () => onNavigate('venue-walls') }}
            className="bg-[var(--surface-2)]"
          />
        </div>
      </div>

    </div>
  );
}