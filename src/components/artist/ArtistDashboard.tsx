import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Eye, CheckCircle, XCircle } from 'lucide-react';
import { StatCard } from '../ui/stat-card';
import type { User } from '../../App';
import { apiGet } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { calculateProfileCompleteness, type ProfileCompleteness } from '../../lib/profileCompleteness';
import MomentumBanner from './MomentumBanner';
import { ActionCenter } from './ActionCenter';
import { AccountStatusPanel } from './AccountStatusPanel';
import { RecentActivity } from './RecentActivity';

/**
 * ConnectStatus — Stripe Connect payout state.
 * Same shape as ArtistPayoutsCard's internal type; duplicated here to
 * avoid a circular dependency (the original component is NOT removed).
 */
type ConnectStatus = {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
};

interface ArtistDashboardProps {
  onNavigate: (page: string) => void;
  user: User;
}

export function ArtistDashboard({ onNavigate, user }: ArtistDashboardProps) {
  /* ── Existing state (unchanged) ──────────────────────────────────── */
  const [subSuccess, setSubSuccess] = useState<boolean>(false);
  const [subCancelled, setSubCancelled] = useState<boolean>(false);
  const [artworks, setArtworks] = useState<Array<{ id: string; status: string; price?: number }>>([]);
  const [stats, setStats] = useState<{
    subscription?: { tier: string; status: string; isActive: boolean; limits: { artworks: number; activeDisplays: number } };
    artworks: { total: number; active: number; sold: number; available: number };
    displays?: { active: number; limit: number; isOverage: boolean };
    applications?: { pending: number };
    sales: { total: number; recent30Days: number; totalEarnings: number };
    momentum?: { eligible: boolean; reason: string | null; dismissed: boolean; showBanner: boolean };
  } | null>(null);
  const [momentumDismissed, setMomentumDismissed] = useState(false);

  /**
   * Profile completeness — now stores the FULL result so we can pass
   * percentage to ActionCenter. null = still loading.
   */
  const [profileResult, setProfileResult] = useState<ProfileCompleteness | null>(null);

  /**
   * Payout status — lifted here so both ActionCenter (boolean flag) and
   * AccountStatusPanel (full status) can consume it without double-fetching.
   */
  const [payoutStatus, setPayoutStatus] = useState<ConnectStatus | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  /* ── Fetch: profile completeness ─────────────────────────────────── */
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
        if (!artist) {
          setProfileResult({ percentage: 0, completed: [], missing: ['all'], recommendations: [], isComplete: false });
          return;
        }
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
        setProfileResult(result);
      } catch {
        if (!isMounted) return;
        // On error, hide action items rather than flash them
        setProfileResult({ percentage: 100, completed: [], missing: [], recommendations: [], isComplete: true });
      }
    }
    checkProfile();
    return () => { isMounted = false; };
  }, [user.id]);

  /* ── Fetch: subscription URL params ──────────────────────────────── */
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const q = hash.split('?')[1] || '';
      const params = new URLSearchParams(q);
      const sub = params.get('sub');
      if (sub === 'success') setSubSuccess(true);
      if (sub === 'cancel') setSubCancelled(true);
      if (sub) {
        const base = hash.split('?')[0];
        history.replaceState(null, '', base);
      }
    } catch {}
  }, []);

  /* ── Fetch: artist stats ─────────────────────────────────────────── */
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

  /* ── Fetch: payout status ────────────────────────────────────────── */
  const refreshPayoutStatus = async () => {
    setPayoutLoading(true);
    setPayoutError(null);
    try {
      const data = await apiGet<ConnectStatus>(
        `/api/stripe/connect/artist/status?userId=${encodeURIComponent(user.id)}`,
      );
      setPayoutStatus(data);
    } catch (e: any) {
      setPayoutError(e?.message || 'Unable to load payout status');
    } finally {
      setPayoutLoading(false);
    }
  };

  useEffect(() => {
    refreshPayoutStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  /* ── Derived values (unchanged logic) ────────────────────────────── */
  const activeArtworks = stats ? stats.artworks.active : artworks.filter(a => a.status === 'active').length;
  const totalArtworks = stats ? stats.artworks.total : artworks.length;
  const totalEarnings = stats ? stats.sales.totalEarnings : artworks.filter(a => a.status === 'sold').reduce((sum, a) => sum + (a.price || 0), 0);
  const recentSales = stats ? stats.sales.total : artworks.filter(a => a.status === 'sold').length;

  const getPayoutPercentage = (plan: string) => {
    switch (plan) {
      case 'starter': return '80%';
      case 'growth': return '83%';
      case 'pro': return '85%';
      case 'free':
      default: return '60%';
    }
  };

  const currentPlan = (stats?.subscription?.tier ?? 'free') as 'free' | 'starter' | 'growth' | 'pro';
  const isPayoutReady = !!payoutStatus?.hasAccount && !!payoutStatus?.payoutsEnabled;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* ── Toast banners (subscription confirm/cancel + momentum) ── */}
      {subSuccess && (
        <div className="mb-4 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
            <p className="text-sm text-[var(--text)]">
              <span className="font-semibold">Plan activated.</span>{' '}
              <span className="text-[var(--text-muted)]">Fees and limits updated automatically.</span>
            </p>
          </div>
          <button onClick={() => setSubSuccess(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
            Dismiss
          </button>
        </div>
      )}
      {subCancelled && (
        <div className="mb-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-[var(--warning)] flex-shrink-0" />
            <p className="text-sm text-[var(--text)]">
              <span className="font-semibold">Checkout canceled.</span>{' '}
              <span className="text-[var(--text-muted)]">No changes were made.</span>
            </p>
          </div>
          <button onClick={() => setSubCancelled(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
            Dismiss
          </button>
        </div>
      )}
      {stats?.momentum?.showBanner && !momentumDismissed && (
        <MomentumBanner
          onNavigate={onNavigate}
          onDismiss={() => setMomentumDismissed(true)}
        />
      )}

      {/* ═══════ HEADER ═══════ */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] leading-tight tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'Artist'}
        </h1>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2">
          Here's what's happening with your artwork
        </p>
      </div>

      {/* ═══════ KPI STAT CARDS (top row) ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          label="Active Artworks"
          value={activeArtworks}
          subtext={`${totalArtworks} total pieces`}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
          onClick={() => onNavigate('artist-artworks')}
        />
        <StatCard
          label="Total Earnings"
          value={`$${totalEarnings.toFixed(0)}`}
          subtext={`${getPayoutPercentage(currentPlan)} of sales`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          onClick={() => onNavigate('artist-sales')}
        />
        <StatCard
          label="Recent Sales"
          value={recentSales}
          subtext="This month"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
          onClick={() => onNavigate('artist-sales')}
        />
        <StatCard
          label="Pending Applications"
          value={stats?.applications?.pending ?? 0}
          subtext="Awaiting approval"
          icon={<Package className="w-5 h-5" />}
          color="muted"
          onClick={() => onNavigate('artist-applications')}
        />
      </div>

      {/* ═══════ TWO-COLUMN: Action Center + Status ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mb-8">
        {/* LEFT — Action Center (3/5 width on desktop) */}
        <div className="lg:col-span-3">
          <ActionCenter
            profilePercentage={profileResult?.percentage ?? null}
            profileComplete={profileResult?.isComplete ?? null}
            artworksCount={totalArtworks}
            payoutsConnected={payoutLoading ? null : isPayoutReady}
            pendingApplications={stats?.applications?.pending ?? 0}
            onNavigate={onNavigate}
          />
        </div>

        {/* RIGHT — Account Status (2/5 width on desktop) */}
        <div className="lg:col-span-2">
          <AccountStatusPanel
            plan={currentPlan}
            limits={stats?.subscription?.limits ?? { artworks: 3, activeDisplays: 1 }}
            artworksUsed={totalArtworks}
            displaysUsed={stats?.displays?.active ?? 0}
            payoutStatus={payoutStatus}
            payoutLoading={payoutLoading}
            payoutError={payoutError}
            userId={user.id}
            onNavigate={onNavigate}
            onPayoutRefresh={refreshPayoutStatus}
          />
        </div>
      </div>

      {/* ═══════ RECENT ACTIVITY (full-width below) ═══════ */}
      <RecentActivity userId={user.id} onNavigate={onNavigate} />
    </div>
  );
}
