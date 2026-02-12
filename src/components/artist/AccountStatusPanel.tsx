import { useState } from 'react';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Gauge,
} from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';
import { apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '../ui/card';

/**
 * AccountStatusPanel — Right-column status overview for the artist dashboard.
 *
 * Contains:
 * 1. Plan & Limits (tier badge, artwork/display usage, inline upgrade link)
 * 2. Payouts Status (compact Stripe Connect card)
 *
 * Payout status props are lifted from the dashboard so we don't duplicate
 * the fetch. The startOnboarding / openStripeDashboard actions ARE duplicated
 * from ArtistPayoutsCard — intentionally, to avoid deep prop drilling while
 * keeping the original component intact for other pages.
 */

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
}

interface AccountStatusPanelProps {
  plan: 'free' | 'starter' | 'growth' | 'pro';
  limits: { artworks: number; activeDisplays: number };
  artworksUsed: number;
  displaysUsed: number;
  payoutStatus: ConnectStatus | null;
  payoutLoading: boolean;
  payoutError: string | null;
  userId: string;
  onNavigate: (page: string) => void;
  onPayoutRefresh: () => void;
}

export function AccountStatusPanel({
  plan,
  limits,
  artworksUsed,
  displaysUsed,
  payoutStatus,
  payoutLoading,
  payoutError,
  userId,
  onNavigate,
  onPayoutRefresh,
}: AccountStatusPanelProps) {
  const [payoutWorking, setPayoutWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const isPayoutReady =
    !!payoutStatus?.hasAccount && !!payoutStatus?.payoutsEnabled;

  /* ── Stripe Connect actions (same logic as ArtistPayoutsCard) ─────── */
  const startOnboarding = async () => {
    try {
      setPayoutWorking(true);
      setLocalError(null);
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        setLocalError('Please sign in to set up payouts.');
        return;
      }
      await apiPost<{ accountId: string }>(
        '/api/stripe/connect/artist/create-account',
        {},
      );
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/artist/account-link',
        {},
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setLocalError(e?.message || 'Unable to start Stripe onboarding');
    } finally {
      setPayoutWorking(false);
      setTimeout(() => onPayoutRefresh(), 2000);
    }
  };

  const openStripeDashboard = async () => {
    try {
      setPayoutWorking(true);
      setLocalError(null);
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        setLocalError('Please sign in to manage payouts.');
        return;
      }
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/connect/artist/login-link',
        {},
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setLocalError(e?.message || 'Unable to open Stripe dashboard');
    } finally {
      setPayoutWorking(false);
    }
  };

  const displayError = localError || payoutError;

  /* ── Limit helpers ─────────────────────────────────────────────────── */
  const artworkLimitLabel =
    limits.artworks >= 9999 ? 'Unlimited' : `${limits.artworks}`;
  const displayLimitLabel =
    limits.activeDisplays >= 9999 ? 'Unlimited' : `${limits.activeDisplays}`;

  return (
    <div className="space-y-5">
      {/* ══════ Plan & Limits Card ══════ */}
      <Card className="bg-[var(--surface-2)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[var(--text)]">
            Plan & Limits
          </CardTitle>
          <CardAction>
            <PlanBadge plan={plan} size="sm" />
          </CardAction>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Artworks usage */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-[var(--text-muted)]">Artworks</span>
              <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                {artworksUsed}
                <span className="text-[var(--text-muted)] font-normal">
                  {' '}/ {artworkLimitLabel}
                </span>
              </span>
            </div>

            {/* Displays usage */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-[var(--text-muted)]">
                Active Displays
              </span>
              <span className="text-sm font-medium text-[var(--text)] tabular-nums">
                {displaysUsed}
                <span className="text-[var(--text-muted)] font-normal">
                  {' '}/ {displayLimitLabel}
                </span>
              </span>
            </div>

            {/* Display usage bar */}
            {limits.activeDisplays < 9999 && (
              <div className="w-full bg-[var(--surface-3)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-[var(--blue)] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (displaysUsed / limits.activeDisplays) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            )}

            {/* Upgrade button — matches Pricing CTA style */}
            {plan !== 'pro' && (
              <button
                onClick={() => onNavigate('plans-pricing')}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors mt-2 ${
                  displaysUsed >= limits.activeDisplays || artworksUsed >= limits.artworks
                    ? 'bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]'
                    : 'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)]'
                }`}
              >
                {displaysUsed >= limits.activeDisplays || artworksUsed >= limits.artworks
                  ? 'Upgrade — you\u2019ve hit a limit'
                  : 'Upgrade plan'}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════ Payouts Status Card ══════ */}
      <Card id="payout-status-section" className="bg-[var(--surface-2)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[var(--text)]">
            <span className="inline-flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
              Payouts
            </span>
          </CardTitle>
          {/* Status badge */}
          {!payoutLoading && (
            <CardAction>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isPayoutReady
                    ? 'bg-[var(--green-muted)] text-[var(--green)]'
                    : 'bg-[var(--warning-muted)] text-[var(--warning)]'
                }`}
              >
                {isPayoutReady ? 'Connected' : 'Action needed'}
              </span>
            </CardAction>
          )}
        </CardHeader>

        <CardContent>
          {payoutLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking status…
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1-line explanation */}
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {isPayoutReady
                  ? 'Stripe is connected — you\u2019ll receive payouts automatically when art sells.'
                  : 'Complete Stripe onboarding so you can get paid when your art sells.'}
              </p>

              {/* Error (hidden behind expandable) */}
              {displayError && (
                <div>
                  <button
                    onClick={() => setShowErrorDetails((v) => !v)}
                    className="flex items-center gap-1 text-xs text-[var(--danger)] hover:underline"
                  >
                    {showErrorDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showErrorDetails ? 'Hide details' : 'Show details'}
                  </button>
                  {showErrorDetails && (
                    <div className="mt-2 text-xs text-[var(--text-muted)] bg-[var(--surface-3)] rounded-lg p-3 border border-[var(--border)]">
                      <p className="text-[var(--danger)] mb-1">{displayError}</p>
                      <p>Common fixes:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>Make sure you're signed in</li>
                        <li>Check VITE_API_BASE_URL in site settings</li>
                        <li>Verify STRIPE_WEBHOOK_SECRET in Worker</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* CTA — matches Pricing button styles */}
              <div className="flex gap-3">
                {!isPayoutReady ? (
                  <button
                    onClick={startOnboarding}
                    disabled={payoutWorking}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60 transition-colors"
                  >
                    {payoutWorking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    Set up payouts
                  </button>
                ) : (
                  <button
                    onClick={openStripeDashboard}
                    disabled={payoutWorking}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-60 transition-colors"
                  >
                    {payoutWorking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    Manage payouts
                  </button>
                )}
                <button
                  onClick={onPayoutRefresh}
                  disabled={payoutWorking}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] disabled:opacity-60 transition-colors"
                  aria-label="Refresh payout status"
                >
                  <Gauge className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
