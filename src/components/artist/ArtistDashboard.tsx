import { TrendingUp, Package, DollarSign, Eye } from 'lucide-react';
import { mockArtworks, mockSales } from '../../data/mockData';
import { PlanBadge } from '../pricing/PlanBadge';
import { UpgradePromptCard } from '../pricing/UpgradePromptCard';
import { ActiveDisplaysMeter } from '../pricing/ActiveDisplaysMeter';
import type { User } from '../../App';
import { ArtistPayoutsCard } from './ArtistPayoutsCard';

interface ArtistDashboardProps {
  onNavigate: (page: string) => void;
  user: User;
}

export function ArtistDashboard({ onNavigate, user }: ArtistDashboardProps) {
  const activeArtworks = mockArtworks.filter(a => a.status === 'active').length;
  const totalArtworks = mockArtworks.length;
  const totalEarnings = mockSales.reduce((sum, sale) => sum + sale.artistEarnings, 0);
  const recentSales = mockSales.length;

  const stats = [
    {
      label: 'Active Artworks',
      value: activeArtworks,
      subtext: `${totalArtworks} total pieces`,
      icon: Eye,
      color: 'blue',
      action: () => onNavigate('artist-artworks'),
    },
    {
      label: 'Total Earnings',
      value: `$${totalEarnings.toFixed(0)}`,
      subtext: '80% of sales',
      icon: DollarSign,
      color: 'blue',
      action: () => onNavigate('artist-sales'),
    },
    {
      label: 'Recent Sales',
      value: recentSales,
      subtext: 'This month',
      icon: TrendingUp,
      color: 'blue',
      action: () => onNavigate('artist-sales'),
    },
    {
      label: 'Pending Applications',
      value: 1,
      subtext: 'Awaiting approval',
      icon: Package,
      color: 'blue',
      action: () => onNavigate('artist-artworks'),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Welcome back, {user.name.split(' ')[0] || 'Artist'}</h1>
            <p className="text-neutral-600 dark:text-neutral-300">Here's what's happening with your artwork</p>
          </div>
          <PlanBadge plan="free" size="md" showUpgrade onUpgrade={() => onNavigate('plans-pricing')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={stat.action}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-300 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="text-3xl mb-1 text-neutral-900 dark:text-neutral-50">{stat.value}</div>
              <div className="text-neutral-600 dark:text-neutral-300 text-sm">{stat.label}</div>
              <div className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">{stat.subtext}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout setup */}
        <ArtistPayoutsCard user={user} />

        {/* Active Displays Meter */}
        <ActiveDisplaysMeter
          currentDisplays={3}
          includedDisplays={1}
          plan="free"
          overageCost={0}
          onUpgrade={() => onNavigate('plans-pricing')}
          onManage={() => onNavigate('artist-artworks')}
        />

        {/* Upgrade Prompt (only show on free/starter/growth) */}
        <div className="lg:col-span-2">
          <UpgradePromptCard currentPlan="free" onUpgrade={() => onNavigate('plans-pricing')} />
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl mb-4 text-neutral-900 dark:text-neutral-50">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">Your artwork "Sunset Boulevard" was sold</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">2 days ago at Brew & Palette Café</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">Application approved for The Artisan Lounge</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">4 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">New artwork "Urban Dreams" uploaded</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">1 week ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl mb-4 text-neutral-900 dark:text-neutral-50">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('artist-artworks')}
              className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white dark:text-neutral-50 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Upload New Artwork
            </button>
            <button
              onClick={() => onNavigate('artist-venues')}
              className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            >
              Browse Available Venues
            </button>
            <button
              onClick={() => onNavigate('artist-sales')}
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
