import { Frame, Users, DollarSign, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';
import type { User } from '../../App';
import { VenuePayoutsCard } from './VenuePayoutsCard';

interface VenueDashboardProps {
  onNavigate: (page: string) => void;
  user?: User;
}

export function VenueDashboard({ onNavigate, user }: VenueDashboardProps) {
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
  const pendingApplications = stats?.applications?.pending ?? 0;
  const venueEarnings = stats?.sales?.totalEarnings ?? 0;

  const venueStats = [
    {
      label: 'Wall Spaces',
      value: `${totalWalls - availableWalls}/${totalWalls}`,
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
      label: 'Active Artists',
      value: totalWalls - availableWalls,
      subtext: 'Currently displaying',
      icon: Users,
      color: 'green',
      action: () => onNavigate('venue-current'),
    },
    {
      label: 'Total Earnings',
      value: `$${venueEarnings.toFixed(0)}`,
      subtext: '15% commission',
      icon: DollarSign,
      color: 'green',
      action: () => onNavigate('venue-sales'),
    },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Welcome back</h1>
        <p className="text-[var(--text-muted)]">Manage your wall spaces and artist applications</p>
      </div>

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
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-2 h-2 bg-[var(--green)] rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text)]">No recent activity</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-xl mb-4 text-[var(--text)]">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('venue-applications')}
              className="w-full px-4 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors flex items-center justify-between"
            >
              <span>Review Applications</span>
              {pendingApplications > 0 && (
                <span className="px-2 py-1 bg-[var(--surface-1)] text-[var(--green)] rounded-full text-xs">
                  {pendingApplications} new
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('venue-walls')}
              className="w-full px-4 py-3 bg-[var(--green-muted)] text-[var(--green)] rounded-lg hover:opacity-90 transition-colors"
            >
              Manage Wall Spaces
            </button>
            <button
              onClick={() => onNavigate('venue-sales')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              View Sales Report
            </button>
            <button
              onClick={() => onNavigate('why-artwalls-venue')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
            >
              Why Artwalls?
            </button>
          </div>
        </div>
      </div>

      {user && (
        <div className="mt-12">
          <VenuePayoutsCard user={user} />
        </div>
      )}
    </div>
  );
}