import { Frame, Users, DollarSign, Clock } from 'lucide-react';
import { mockWallSpaces, mockApplications, mockSales } from '../../data/mockData';

interface VenueDashboardProps {
  onNavigate: (page: string) => void;
}

export function VenueDashboard({ onNavigate }: VenueDashboardProps) {
  const totalWalls = mockWallSpaces.length;
  const availableWalls = mockWallSpaces.filter(w => w.available).length;
  const pendingApplications = mockApplications.filter(a => a.status === 'pending').length;
  const venueEarnings = mockSales.reduce((sum, sale) => sum + sale.venueEarnings, 0);

  const stats = [
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Welcome back, Brew & Palette Café</h1>
        <p className="text-neutral-600">Manage your wall spaces and artist applications</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={stat.action}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                  <Icon className="w-6 h-6 text-green-600 dark:text-green-300 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="text-3xl mb-1 text-neutral-900 dark:text-neutral-50">{stat.value}</div>
              <div className="text-neutral-600 dark:text-neutral-300 text-sm">{stat.label}</div>
              <div className="text-neutral-400 text-xs mt-1">{stat.subtext}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">Artwork "Sunset Boulevard" was sold</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">You earned $29.50 • 2 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">New application from Marcus Rodriguez</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">3 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">New wall space "Corner Space" added</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">1 week ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('venue-applications')}
              className="w-full px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors flex items-center justify-between"
            >
              <span>Review Applications</span>
              {pendingApplications > 0 && (
                <span className="px-2 py-1 bg-white dark:bg-neutral-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                  {pendingApplications} new
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('venue-walls')}
              className="w-full px-4 py-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
            >
              Manage Wall Spaces
            </button>
            <button
              onClick={() => onNavigate('venue-sales')}
              className="w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              View Sales Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}