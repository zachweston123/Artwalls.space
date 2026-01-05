import { Frame, Users, DollarSign, Clock } from 'lucide-react';
import { mockWallSpaces, mockApplications, mockSales } from '../../data/mockData';
import type { User } from '../../App';
import { VenuePayoutsCard } from './VenuePayoutsCard';

interface VenueDashboardProps {
  onNavigate: (page: string) => void;
  user?: User;
}

export function VenueDashboard({ onNavigate, user }: VenueDashboardProps) {
  const totalWalls = mockWallSpaces.length;
  const availableWalls = mockWallSpaces.filter(w => w.available).length;
  const pendingApplications = mockApplications.filter(a => a.status === 'pending').length;
  const venueEarnings = mockSales.reduce((sum, sale) => sum + sale.venueEarnings, 0);

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
      subtext: '10% commission',
      icon: DollarSign,
      color: 'green',
      action: () => onNavigate('venue-sales'),
    },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Welcome back, Brew & Palette Café</h1>
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
                <p className="text-sm text-[var(--text)]">Artwork "Sunset Boulevard" was sold</p>
                <p className="text-xs text-[var(--text-muted)]">You earned $29.50 • 2 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-2 h-2 bg-[var(--blue)] rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text)]">New application from Marcus Rodriguez</p>
                <p className="text-xs text-[var(--text-muted)]">3 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-[var(--border)] rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-[var(--text)]">New wall space "Corner Space" added</p>
                <p className="text-xs text-[var(--text-muted)]">1 week ago</p>
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