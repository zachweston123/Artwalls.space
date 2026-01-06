import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Eye, Search, CheckCircle, XCircle } from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';
import { UpgradePromptCard } from '../pricing/UpgradePromptCard';
import { ActiveDisplaysMeter } from '../pricing/ActiveDisplaysMeter';
import type { User } from '../../App';
import { ArtistPayoutsCard } from './ArtistPayoutsCard';
import { apiGet } from '../../lib/api';

interface ArtistDashboardProps {
  onNavigate: (page: string) => void;
  user: User;
}

export function ArtistDashboard({ onNavigate, user }: ArtistDashboardProps) {
  const [subSuccess, setSubSuccess] = useState<boolean>(false);
  const [subCancelled, setSubCancelled] = useState<boolean>(false);
  const [artworks, setArtworks] = useState<Array<{ id: string; status: string; price?: number }>>([]);
  const [stats, setStats] = useState<{ artworks: { total: number; active: number; sold: number; available: number }; sales: { total: number; recent30Days: number; totalEarnings: number } } | null>(null);

  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const q = hash.split('?')[1] || '';
      const params = new URLSearchParams(q);
      const sub = params.get('sub');
      if (sub === 'success') setSubSuccess(true);
      if (sub === 'cancel') setSubCancelled(true);
      // Clean the flag from URL (optional)
      if (sub) {
        const base = hash.split('?')[0];
        history.replaceState(null, '', base);
      }
    } catch {}
  }, []);
  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const s = await apiGet<{ artistId: string; artworks: { total: number; active: number; sold: number; available: number }; sales: { total: number; recent30Days: number; totalEarnings: number } }>(`/api/stats/artist?artistId=${user.id}`);
        if (!isMounted) return;
        setStats({ artworks: s.artworks, sales: s.sales });
      } catch {
        // Fallback to artworks listing for minimal stats
        try {
          const resp = await apiGet<{ artworks: Array<{ id: string; status: string; price?: number }> }>(`/api/artworks?artistId=${user.id}`);
          if (!isMounted) return;
          setArtworks(resp.artworks || []);
        } catch {
          if (!isMounted) return;
          setArtworks([]);
        }
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, [user.id]);

  const activeArtworks = stats ? stats.artworks.active : artworks.filter(a => a.status === 'active').length;
  const totalArtworks = stats ? stats.artworks.total : artworks.length;
  const totalEarnings = stats ? stats.sales.totalEarnings : artworks.filter(a => a.status === 'sold').reduce((sum, a) => sum + (a.price || 0), 0);
  const recentSales = stats ? stats.sales.total : artworks.filter(a => a.status === 'sold').length;

  const dashboardStats = [
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
      action: () => onNavigate('artist-applications'),
    },
  ];

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* Subscription success banner */}
      {subSuccess && (
        <div className="mb-4 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--green)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Subscription activated</p>
              <p className="text-xs text-[var(--text-muted)]">Your plan is now active. Platform fee and features will update automatically.</p>
            </div>
          </div>
          <button onClick={() => setSubSuccess(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Dismiss
          </button>
        </div>
      )}
      {subCancelled && (
        <div className="mb-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-[var(--warning)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Subscription canceled</p>
              <p className="text-xs text-[var(--text-muted)]">No changes were made. You can upgrade anytime from Pricing.</p>
            </div>
          </div>
          <button onClick={() => setSubCancelled(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Dismiss
          </button>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════
          HEADER SECTION (Welcome + Plan Chip + Upgrade Button)
          ════════════════════════════════════════════════════════════ */}
      <div className="border-b border-[var(--border)] mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-[var(--text)] mb-1">
              Welcome back, {user.name.split(' ')[0] || 'Artist'}
            </h1>
            <p className="text-[var(--text-muted)]">
              Here's what's happening with your artwork
            </p>
          </div>
          
          {/* Plan Chip + Upgrade Button (Right side) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Plan:</span>
              <span className="text-xs font-bold text-[var(--blue)]">Free</span>
            </div>
            <button
              onClick={() => onNavigate('plans-pricing')}
              className="px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ACTION REQUIRED BANNER (Compact, Clear CTA)
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8 bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-5 h-5 text-[var(--warning)] flex-shrink-0">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">Complete your artist profile</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Venues are more likely to invite artists with complete profiles</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('artist-profile')}
          className="flex-shrink-0 px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Complete
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SEARCH MODULE (Compact, Clear Input + Primary Button)
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search venues by name, location, or style..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => onNavigate('artist-venues')}
            className="flex-shrink-0 px-4 py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Find Venues</span>
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] px-1">
          Browse {Math.floor(Math.random() * 50) + 100}+ available wall spaces across your city
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          STAT CARDS GRID (Minimal, Balanced)
          ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={stat.action}
              className="group bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-5 transition-all hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] text-left"
            >
              {/* Icon - Reduced weight/size */}
              <div className="w-10 h-10 bg-[color:color-mix(in_srgb,var(--blue)_12%,transparent)] rounded-md flex items-center justify-center mb-3 group-hover:bg-[color:color-mix(in_srgb,var(--blue)_20%,transparent)] transition-colors">
                <Icon className="w-5 h-5 text-[var(--blue)]" />
              </div>
              
              {/* Metric */}
              <div className="text-2xl font-bold text-[var(--text)] mb-1">
                {stat.value}
              </div>
              
              {/* Label */}
              <div className="text-sm font-medium text-[var(--text-muted)] mb-0.5">
                {stat.label}
              </div>
              
              {/* Sublabel */}
              <div className="text-xs text-[var(--text-muted)]">
                {stat.subtext}
              </div>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════
          MAIN CONTENT GRID (Cards + Widgets)
          ════════════════════════════════════════════════════════════ */}
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

        {/* Upgrade Prompt (full-width) */}
        <div className="lg:col-span-2">
          <UpgradePromptCard currentPlan="free" onUpgrade={() => onNavigate('plans-pricing')} />
        </div>

        {/* Recent Activity Card */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text)] mb-1">Recent Activity</h2>
            <p className="text-sm text-[var(--text-muted)]">Latest updates on your artwork</p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                type: 'success',
                title: 'Your artwork "Sunset Boulevard" was sold',
                time: '2 days ago at Brew & Palette Café',
              },
              {
                type: 'info',
                title: 'Application approved for The Artisan Lounge',
                time: '4 days ago',
              },
              {
                type: 'neutral',
                title: 'New artwork "Urban Dreams" uploaded',
                time: '1 week ago',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    item.type === 'success'
                      ? 'bg-[var(--green)]'
                      : item.type === 'info'
                      ? 'bg-[var(--blue)]'
                      : 'bg-[var(--text-muted)]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--text)] mb-1">Quick Actions</h2>
            <p className="text-sm text-[var(--text-muted)]">Common tasks</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('artist-artworks')}
              className="w-full px-4 py-3 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Upload New Artwork
            </button>
            <button
              onClick={() => onNavigate('artist-venues')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-semibold text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Browse Available Venues
            </button>
            <button
              onClick={() => onNavigate('artist-sales')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)] font-semibold text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              View Sales Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
