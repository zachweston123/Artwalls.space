import { User, Mail, Link as LinkIcon, DollarSign, Edit } from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';

interface ArtistProfileProps {
  onNavigate: (page: string) => void;
}

export function ArtistProfile({ onNavigate }: ArtistProfileProps) {
  // Mock data - in production this would come from user state
  const profile = {
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    portfolioUrl: 'https://sarahchen.art',
    totalEarnings: 2847.50,
    pendingPayout: 236.00,
    currentPlan: 'free' as const,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900">Artist Profile</h1>
        <p className="text-neutral-600">Manage your account information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl mb-1 text-neutral-900">{profile.name}</h2>
                  <PlanBadge plan={profile.currentPlan} size="sm" showUpgrade onUpgrade={() => onNavigate('plans-pricing')} />
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
                <Mail className="w-5 h-5 text-neutral-500 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-neutral-500 mb-1">Email Address</label>
                  <p className="text-neutral-900">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
                <LinkIcon className="w-5 h-5 text-neutral-500 mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-neutral-500 mb-1">Portfolio Website</label>
                  <a 
                    href={profile.portfolioUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {profile.portfolioUrl}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 p-6">
            <h3 className="text-lg mb-4 text-neutral-900">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                <p className="text-neutral-900 mb-1">Password & Security</p>
                <p className="text-sm text-neutral-500">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                <p className="text-neutral-900 mb-1">Notification Preferences</p>
                <p className="text-sm text-neutral-500">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Summary Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg text-neutral-900">Earnings Summary</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Total Earnings (80%)</p>
                <p className="text-2xl text-neutral-900">${profile.totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-500 mb-1">Pending Payout</p>
                <p className="text-xl text-blue-600">${profile.pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-neutral-500 mt-1">Processed monthly on the 15th</p>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('artist-sales')}
              className="w-full mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              View Sales History
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg mb-3 text-neutral-900">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('artist-artworks')}
              <button className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors">
              >
                Manage Artworks
              </button>
              <button 
                onClick={() => onNavigate('artist-venues')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Browse Venues
              </button>
              <button 
                onClick={() => onNavigate('plans-pricing')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
