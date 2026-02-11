import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Eye, Search, CheckCircle, XCircle } from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';
import { UpgradePromptCard } from '../pricing/UpgradePromptCard';
import { ActiveDisplaysMeter } from '../pricing/ActiveDisplaysMeter';
import type { User } from '../../App';
import { ArtistPayoutsCard } from './ArtistPayoutsCard';
import { apiGet } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { calculateProfileCompleteness } from '../../lib/profileCompleteness';
import MomentumBanner from './MomentumBanner';

interface ArtistDashboardProps {
  onNavigate: (page: string) => void;
  user: User;
}

export function ArtistDashboard({ onNavigate, user }: ArtistDashboardProps) {
  const [subSuccess, setSubSuccess] = useState<boolean>(false);
  const [subCancelled, setSubCancelled] = useState<boolean>(false);
  const [artworks, setArtworks] = useState<Array<{ id: string; status: string; price?: number }>>([]);
  const [availableWallspaces, setAvailableWallspaces] = useState<number | null>(null);
  const [availableWallspacesStatus, setAvailableWallspacesStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [stats, setStats] = useState<{
    subscription?: { tier: string; status: string; isActive: boolean; limits: { artworks: number; activeDisplays: number } };
    artworks: { total: number; active: number; sold: number; available: number };
    displays?: { active: number; limit: number; isOverage: boolean };
    applications?: { pending: number };
    sales: { total: number; recent30Days: number; totalEarnings: number };
    momentum?: { eligible: boolean; reason: string | null; dismissed: boolean; showBanner: boolean };
  } | null>(null);
  const [momentumDismissed, setMomentumDismissed] = useState(false);
  // null = still loading (don't flash banner), true/false = resolved
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  // Fetch artist profile to determine completeness
  useEffect(() => {
    let isMounted = true;
    async function checkProfile() {
      try {
        const { data: artist } = await supabase
          .from('artists')
          .select('name, profile_photo_url, bio, art_types, city_primary, phone_number, portfolio_url, instagram_handle')
          .eq('id', user.id)
          .maybeSingle();
        if (!isMounted) return;
        if (!artist) { setProfileComplete(false); return; }
        const result = calculateProfileCompleteness({
          name: artist.name ?? undefined,
          profilePhoto: artist.profile_photo_url ?? undefined,
          bio: artist.bio ?? undefined,
          artTypes: artist.art_types ?? undefined,
          primaryCity: artist.city_primary ?? undefined,
          phone: artist.phone_number ?? undefined,
          portfolioUrl: artist.portfolio_url ?? undefined,
          instagramHandle: artist.instagram_handle ?? undefined,
        });
        setProfileComplete(result.isComplete);
      } catch {
        if (!isMounted) return;
        // On error, hide banner rather than flash it
        setProfileComplete(true);
      }
    }
    checkProfile();
    return () => { isMounted = false; };
  }, [user.id]);

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
        const s = await apiGet<{
          artistId: string;
          subscription?: { tier: string; status: string; isActive: boolean; limits: { artworks: number; activeDisplays: number } };
          artworks: { total: number; active: number; sold: number; available: number };
          displays?: { active: number; limit: number; isOverage: boolean };
          applications?: { pending: number };
          sales: { total: number; recent30Days: number; totalEarnings: number };
          momentum?: { eligible: boolean; reason: string | null; dismissed: boolean; showBanner: boolean };
        }>(`/api/stats/artist?artistId=${user.id}`);
        if (!isMounted) return;
        setStats({
          subscription: s.subscription,
          artworks: s.artworks,
          displays: s.displays,
          applications: s.applications,
          sales: s.sales,
          momentum: s.momentum,
        });
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

  // Fetch available wallspaces count
  useEffect(() => {
    let isMounted = true;
    async function loadWallspaces() {
      try {
        const resp = await apiGet<{ total: number }>('/api/wallspaces/available');
        if (!isMounted) return;
        setAvailableWallspaces(resp.total || 0);
        setAvailableWallspacesStatus('loaded');
      } catch {
        if (!isMounted) return;
        setAvailableWallspaces(null);
        setAvailableWallspacesStatus('error');
      }
    }
    loadWallspaces();
    return () => { isMounted = false; };
  }, []);

  const wallspacesMessage =
    availableWallspacesStatus === 'loaded'
      ? `Browse ${availableWallspaces ?? 0}+ available wall spaces across your city`
      : availableWallspacesStatus === 'loading'
        ? 'Loading wall space availability...'
        : 'Wall space availability is temporarily unavailable';

  const activeArtworks = stats ? stats.artworks.active : artworks.filter(a => a.status === 'active').length;
  const totalArtworks = stats ? stats.artworks.total : artworks.length;
  const totalEarnings = stats ? stats.sales.totalEarnings : artworks.filter(a => a.status === 'sold').reduce((sum, a) => sum + (a.price || 0), 0);
  const recentSales = stats ? stats.sales.total : artworks.filter(a => a.status === 'sold').length;

  const getPayoutPercentage = (plan: string) => {
    switch (plan) {
      case 'starter':
        return '80%';
      case 'growth':
        return '83%';
      case 'pro':
        return '85%';
      case 'free':
      default:
        return '60%';
    }
  };

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
      subtext: `${getPayoutPercentage(stats?.subscription?.tier ?? 'free')}% of sales`,
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
      value: stats?.applications?.pending ?? 0,
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
      {/* ── Momentum upgrade banner ── */}
      {stats?.momentum?.showBanner && !momentumDismissed && (
        <MomentumBanner
          onNavigate={onNavigate}
          onDismiss={() => setMomentumDismissed(true)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
          HEADER SECTION (Welcome + Plan Chip + Upgrade Button)
          ════════════════════════════════════════════════════════════ */}
      <div className="border-b border-[var(--border)] mb-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] mb-1">
              Welcome back, {user?.name?.split(' ')[0] || 'Artist'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Here's what's happening with your artwork
            </p>
          </div>
          
          {/* Plan Chip + Upgrade Button (Right side) */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Plan:</span>
              <span className="text-xs font-bold text-[var(--blue)] uppercase tracking-wider">Free</span>
            </div>
            <button
              onClick={() => onNavigate('plans-pricing')}
              className="flex-1 sm:flex-none px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ACTION REQUIRED BANNER (Compact, Clear CTA)
          Only shown when profile is incomplete. Hidden while loading
          to avoid flicker.
          ════════════════════════════════════════════════════════════ */}
      {profileComplete === false && (
        <div className="mb-8 bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-5 h-5 mt-0.5 text-[var(--warning)] flex-shrink-0">
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
            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] text-sm font-semibold rounded-lg transition-colors"
          >
            Complete Now
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SEARCH MODULE (Compact, Clear Input + Primary Button)
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search venues by name, location, or style..."
              className="w-full pl-12 pr-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-transparent transition-all text-sm"
            />
          </div>
          <button
            onClick={() => onNavigate('artist-venues')}
            className="flex-shrink-0 px-6 py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Find Venues</span>
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] px-1">
          {wallspacesMessage}
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
              className="group bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 transition-all hover:border-[var(--border-hover)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] text-left"
            >
              {/* Icon - Reduced weight/size */}
              <div className="w-10 h-10 bg-[var(--blue-muted)] rounded-lg flex items-center justify-center mb-3 transition-colors">
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
          currentDisplays={stats?.displays?.active ?? 0}
          includedDisplays={stats?.subscription?.limits?.activeDisplays ?? 1}
          plan={(stats?.subscription?.tier ?? 'free') as 'free' | 'starter' | 'growth' | 'pro'}
          overageCost={stats?.subscription?.tier === 'starter' ? 5 : stats?.subscription?.tier === 'growth' ? 4 : 0}
          onUpgrade={() => onNavigate('plans-pricing')}
          onManage={() => onNavigate('artist-artworks')}
        />

        {/* Upgrade Prompt (full-width) */}
        <div className="lg:col-span-2">
          <UpgradePromptCard currentPlan={stats?.subscription?.tier ?? 'free'} onUpgrade={() => onNavigate('plans-pricing')} />
        </div>

        {/* Recent Activity Card */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Recent Activity</h2>
            <p className="text-sm text-[var(--text-muted)]">Latest updates on your artwork</p>
          </div>
          
          <div className="space-y-4">
            {[
              { title: 'Profile updated', time: '2 days ago', type: 'info' },
              { title: 'New artwork approved at Venue Gallery', time: '5 days ago', type: 'success' },
              { title: 'Payout scheduled', time: '1 week ago', type: 'success' },
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
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Quick Actions</h2>
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
              onClick={() => onNavigate('artist-invite-venue')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-medium text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Invite a venue
            </button>
            <button
              onClick={() => onNavigate('artist-venues')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-medium text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Browse Available Venues
            </button>
            <button
              onClick={() => onNavigate('artist-sales')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-medium text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              View Sales Report
            </button>
            <button
              onClick={() => onNavigate('why-artwalls-artist')}
              className="w-full px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] font-medium text-sm rounded-lg border border-[var(--border)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Why Artwalls?
            </button>          </div>
        </div>
      </div>
    </div>
  );
}
