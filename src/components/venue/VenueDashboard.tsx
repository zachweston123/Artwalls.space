import { Frame, Users, DollarSign, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';
import { VenuePayoutsCard } from './VenuePayoutsCard';
import { PageHeader } from '../PageHeader';
import { formatCurrency, formatRatioOrCount } from '../../utils/format';
import { EmptyState } from '../EmptyState';
import { VenueSetupChecklist } from '../VenueSetupChecklist';

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
      subtext: 'Awaiting review',
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
        primaryAction={{ label: 'Add wall space', onClick: () => onNavigate('venue-walls') }}
        secondaryAction={{ label: 'Find artists', onClick: () => onNavigate('venue-find-artists') }}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {venueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={stat.action}
              className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] hover:border-[var(--green)] hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[var(--green-muted)] rounded-lg flex items-center justify-center group-hover:bg-[var(--green)] transition-colors">
                  <Icon className="w-6 h-6 text-[var(--green)] group-hover:text-[var(--accent-contrast)] transition-colors" />
                </div>
              </div>
              <div className="text-3xl mb-1 text-[var(--text)]">{stat.value}</div>
              <div className="text-[var(--text-muted)] text-sm">{stat.label}</div>
              <div className="text-[var(--text-muted)] text-xs mt-1">{stat.subtext}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-xl mb-4 text-[var(--text)]">Recent Activity</h2>
          <EmptyState
            title="No recent activity yet"
            description="Once you review applications or add wall spaces, activity will show up here."
            icon={<Clock className="w-6 h-6" />}
            primaryAction={{ label: 'Complete profile', onClick: () => onNavigate('venue-profile') }}
            secondaryAction={{ label: 'Add wall space', onClick: () => onNavigate('venue-walls') }}
            className="bg-[var(--surface-2)]"
          />
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-xl mb-4 text-[var(--text)]">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('venue-applications')}
              className="w-full px-4 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors flex items-center justify-between"
            >
              <span>Review applications</span>
              {pendingApplications > 0 && (
                <span className="px-2 py-1 bg-[var(--surface-1)] text-[var(--green)] rounded-full text-xs">
                  {pendingApplications} new
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('venue-walls')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Manage wall spaces
            </button>
            <button
              onClick={() => onNavigate('venue-find-artists')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Invite artists
            </button>
            <button
              onClick={() => onNavigate('venue-curated-sets')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Browse curated sets
            </button>
            <button
              onClick={() => onNavigate('venue-sales')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Set up payouts
            </button>
          </div>
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            Want the story? <button onClick={() => onNavigate('why-artwalls-venue')} className="text-[var(--green)] hover:underline">Why Artwalls</button>
          </div>
        </div>
      </div>

    </div>
  );
}