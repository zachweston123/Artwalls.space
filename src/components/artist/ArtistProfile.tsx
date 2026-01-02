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
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Artist Profile</h1>
        <p className="text-[var(--text-muted)]">Manage your account information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-[var(--blue)]" />
                </div>
                <div>
                  <h2 className="text-2xl mb-1 text-[var(--text)]">{profile.name}</h2>
                  <PlanBadge plan={profile.currentPlan} size="sm" showUpgrade onUpgrade={() => onNavigate('plans-pricing')} />
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] rounded-lg transition-colors">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                <Mail className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Email Address</label>
                  <p className="text-[var(--text)]">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                <LinkIcon className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Portfolio Website</label>
                  <a 
                    href={profile.portfolioUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--blue)] hover:text-[var(--blue-hover)] underline"
                  >
                    {profile.portfolioUrl}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] p-6">
            <h3 className="text-lg mb-4 text-[var(--text)]">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
                <p className="text-[var(--text)] mb-1">Password & Security</p>
                <p className="text-sm text-[var(--text-muted)]">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
                <p className="text-[var(--text)] mb-1">Notification Preferences</p>
                <p className="text-sm text-[var(--text-muted)]">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Summary Card */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--green)]" />
              </div>
              <h3 className="text-lg text-[var(--text)]">Earnings Summary</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Earnings (80%)</p>
                <p className="text-2xl text-[var(--text)]">${profile.totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Pending Payout</p>
                <p className="text-xl text-[var(--green)]">${profile.pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Processed monthly on the 15th</p>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('artist-sales')}
              className="w-full mt-4 px-4 py-2 bg-[var(--surface-2)] text-[var(--blue)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
            >
              View Sales History
            </button>
          </div>

          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-3 text-[var(--text)]">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('artist-artworks')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Manage Artworks
              </button>
              <button 
                onClick={() => onNavigate('artist-venues')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Browse Venues
              </button>
              <button 
                onClick={() => onNavigate('plans-pricing')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
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
