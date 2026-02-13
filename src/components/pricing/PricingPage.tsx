import { Check, Sparkles, Shield, TrendingUp, Zap, Calculator, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiPost } from '../../lib/api';
import { PRICING_COPY } from '../../lib/feeCopy';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { EarningsComparisonBlurb } from './EarningsComparisonBlurb';

interface PricingPageProps {
  onNavigate: (page: string) => void;
  currentPlan?: 'free' | 'starter' | 'growth' | 'pro';
}

export function PricingPage({ onNavigate, currentPlan = 'free' }: PricingPageProps) {
  const [showProtectionDetails, setShowProtectionDetails] = useState(false);
  const [saleValue, setSaleValue] = useState(100);
  const [artworksPerMonth, setArtworksPerMonth] = useState(5);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState<boolean>(false);

  // Helper functions for number formatting
  const formatCurrency = (centAmount: number) => {
    return (centAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const formatWhole = (num: number) => {
    return Math.round(num).toLocaleString('en-US');
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: '/mo',
      icon: Sparkles,
      takeHome: 60,
      tagline: 'Perfect for trying Artwalls',
      features: [
        '1 active display included',
        '1 artwork listing',
        'Basic QR generation',
        'Weekly payouts',
      ],
      activeDisplays: 1,
      overagePricing: null,
      payoutSpeed: 'Weekly',
      protection: 'Optional at $5/artwork/mo',
      protectionCap: '$100 per incident',
      claimLimit: 'Up to 2 claims/year',
      cta: currentPlan === 'free' ? 'Current Plan' : 'Downgrade',
      popular: false,
      disabled: currentPlan === 'free',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 9,
      period: '/mo',
      icon: TrendingUp,
      takeHome: 80,
      tagline: 'Great for growing artists',
      features: [
        '4 active displays included',
        'Up to 10 artworks',
        'Priority support',
        'Standard payouts',
      ],
      activeDisplays: 4,
      overagePricing: '$5/mo per additional display',
      payoutSpeed: 'Standard',
      protection: 'Optional at $3/artwork/mo',
      protectionCap: '$100 per incident',
      claimLimit: 'Up to 2 claims/year',
      cta: currentPlan === 'starter' ? 'Current Plan' : 'Get Started',
      popular: false,
      disabled: currentPlan === 'starter',
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 19,
      period: '/mo',
      icon: Zap,
      takeHome: 83,
      tagline: 'Most popular for active artists',
      features: [
        '10 active displays included',
        'Up to 30 artworks',
        'Unlimited applications',
        'Priority visibility boost',
      ],
      activeDisplays: 10,
      overagePricing: '$4/mo per additional display',
      payoutSpeed: 'Standard',
      protection: 'Optional at $3/artwork/mo',
      protectionCap: '$150 per incident',
      claimLimit: 'Up to 3 claims/year',
      cta: currentPlan === 'growth' ? 'Current Plan' : 'Upgrade to Growth',
      popular: true,
      disabled: currentPlan === 'growth',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 39,
      period: '/mo',
      icon: Shield,
      takeHome: 85,
      tagline: 'Best for high-volume artists',
      features: [
        'Unlimited active displays',
        'Unlimited artworks',
        'Unlimited applications',
        'Free protection plan',
        'Featured artist eligibility',
      ],
      activeDisplays: 'Unlimited',
      overagePricing: null,
      payoutSpeed: 'Fast',
      protection: 'Included FREE',
      protectionCap: '$200 per incident',
      claimLimit: 'Up to 4 claims/year',
      cta: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      popular: false,
      disabled: currentPlan === 'pro',
    },
  ];

  type PlanId = 'free' | 'starter' | 'growth' | 'pro';

  const planArtworkLimits: Record<PlanId, number> = {
    free: 1,
    starter: 10,
    growth: 30,
    pro: Number.POSITIVE_INFINITY,
  };

  const selectedPlanForCalculator = (selectedPlanId ?? 'pro') as PlanId;
  const maxArtworksForCalculatorUI = useMemo(() => {
    // For non-Pro, match the plan's listing limit.
    // For Pro, allow a higher slider range (still unlimited in plan copy).
    if (selectedPlanForCalculator === 'pro') return 75;
    return planArtworkLimits[selectedPlanForCalculator];
  }, [selectedPlanForCalculator]);

  useEffect(() => {
    // Keep the control valid when switching plans (e.g., Pro -> Free).
    setArtworksPerMonth((current) => {
      const next = Number.isFinite(maxArtworksForCalculatorUI)
        ? Math.min(current, maxArtworksForCalculatorUI)
        : current;
      return Math.max(1, next);
    });
  }, [maxArtworksForCalculatorUI]);

  // NEW MODEL: Calculate artist take-home per sale
  // Artist takes home a percentage of LIST PRICE
  // Venue always gets 15% of list price (UPDATED)
  // Buyer pays 4.5% fee on top of list price at checkout (UPDATED)
  // Platform & Processing gets the remainder after Stripe fees
  const calculateArtistTakeHome = (listPrice: number, takeHomePct: number) => {
    const artistAmount = listPrice * (takeHomePct / 100);
    const venueAmount = listPrice * 0.15; // Venue always 15% (UPDATED)
    const buyerFee = listPrice * 0.045; // Buyer fee always 4.5% (UPDATED)
    const buyerTotal = listPrice + buyerFee; // What buyer pays
    const platformGross = listPrice - artistAmount - venueAmount; // Platform's gross before Stripe
    
    return {
      listPrice,
      artistAmount,
      artistPct: takeHomePct,
      venueAmount,
      venuePct: 15,
      buyerFee,
      buyerTotal,
      buyerFeePct: 4.5,
      platformGross,
    };
  };

  const calculateMonthlyNet = (planId: PlanId, takeHomePct: number, subscriptionPrice: number, protectionIncluded: boolean) => {
    const artworkLimit = planArtworkLimits[planId];
    const allowedArtworks = Math.max(0, Math.min(artworksPerMonth, artworkLimit));
    const protectionCostPerArtwork = protectionIncluded ? 0 : 3;
    const monthlyProtectionCost = allowedArtworks * protectionCostPerArtwork;
    const monthlyGross = allowedArtworks * (saleValue * (takeHomePct / 100));
    const monthlyNet = Math.max(0, monthlyGross - subscriptionPrice - monthlyProtectionCost);
    return {
      allowedArtworks,
      artworkLimit,
      monthlyGross,
      monthlyProtectionCost,
      monthlyNet,
    };
  };

  const freeEarnings = calculateArtistTakeHome(saleValue, 60);
  const starterEarnings = calculateArtistTakeHome(saleValue, 80);
  const growthEarnings = calculateArtistTakeHome(saleValue, 83);
  const proEarnings = calculateArtistTakeHome(saleValue, 85);

  const freeMonthly = calculateMonthlyNet('free', 60, 0, false);
  const starterMonthly = calculateMonthlyNet('starter', 80, 9, false);
  const growthMonthly = calculateMonthlyNet('growth', 83, 19, false);
  const proMonthly = calculateMonthlyNet('pro', 85, 39, true);

  async function startSubscription(tier: PlanId) {
    if (tier === 'free') return;
    setError(null);
    setSubscribing(tier);
    try {
      // Map UI tiers to backend tiers. Server supports 'starter' | 'growth' | 'pro'.
      const mappedTier = tier;
      // Dev fallback: include artistId if available via Supabase
      let artistId: string | undefined = undefined;
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.auth.getSession();
        artistId = data.session?.user?.id;
        const token = data.session?.access_token;
        if (!token) {
          setError('Please sign in to purchase a subscription plan.');
          return;
        }
      } catch {}
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/billing/create-subscription-session',
        { tier: mappedTier, artistId },
      );
      window.location.href = url;
    } catch (e: any) {
      console.error('Subscription error:', e);
      
      // Better error messages
      let userMessage = 'Unable to start subscription checkout';
      if (e.message?.includes('CORS') || e.message?.includes('Failed to fetch')) {
        userMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (e.message?.includes('offline')) {
        userMessage = 'You appear to be offline. Please check your connection.';
      } else if (e.message?.includes('Unauthorized')) {
        userMessage = 'Please sign in to purchase a subscription plan.';
      } else if (e.message?.includes('Invalid tier')) {
        userMessage = 'Invalid plan selected. Please try again.';
      } else if (e.message) {
        userMessage = e.message; // Use the specific error message from server
      }
      
      setError(userMessage);
    } finally {
      setSubscribing(null);
    }
  }

  async function openBillingPortal() {
    setError(null);
    setManagingPortal(true);
    try {
      let token: string | undefined = undefined;
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
      } catch {}
      if (!token) {
        setError('Please sign in to manage your subscription.');
        return;
      }
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/billing/create-portal-session',
        {}
      );
      window.location.href = url;
    } catch (e: any) {
      console.error('Billing portal error:', e);
      
      // Better error messages
      let userMessage = 'Unable to open Billing Portal';
      if (e.message?.includes('CORS') || e.message?.includes('Failed to fetch')) {
        userMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (e.message?.includes('offline')) {
        userMessage = 'You appear to be offline. Please check your connection.';
      } else if (e.message?.includes('Unauthorized')) {
        userMessage = 'Please sign in to manage your subscription.';
      } else if (e.message?.includes('No subscription found')) {
        userMessage = 'No active subscription found. Please purchase a plan first.';
      } else if (e.message) {
        userMessage = e.message; // Use the specific error message from server
      }
      
      setError(userMessage);
    } finally {
      setManagingPortal(false);
    }
  }

  return (
    <div className="bg-[var(--bg)]">
      <div className="text-center mb-12">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Plans & Pricing</h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Choose the plan that fits your needs. Upgrade anytime as your art business grows.
        </p>
      </div>

      <EarningsComparisonBlurb variant="pricing" />

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`bg-[var(--surface-2)] rounded-xl border-2 p-8 relative transition-all ${
                plan.popular ? 'border-[var(--accent)] shadow-lg scale-105' : 'border-[var(--border)]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white px-4 py-1 rounded-full text-xs font-bold">
                  Most Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[var(--text)]">{plan.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{plan.tagline}</p>
                </div>
                <Icon className="w-8 h-8 text-[var(--accent)] flex-shrink-0" />
              </div>

              {/* Artist Take-Home Percentage - Prominent Display */}
              <div className="bg-[var(--surface-3)] border border-[var(--accent)] rounded-lg p-3 mb-4">
                <div className="text-xs text-[var(--text-muted)] font-semibold">{PRICING_COPY.takeHomeLabel}</div>
                <div className="text-2xl font-bold text-[var(--accent)]">{plan.takeHome}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{PRICING_COPY.takeHomeSubtext}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-2">{PRICING_COPY.platformSupport}</div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-[var(--text)]">{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                <span className="text-[var(--text-muted)] ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-[var(--text)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-[var(--border)] pt-4 mb-6">
                <p className="text-xs text-[var(--text-muted)] mb-2">Artwork Protection Plan:</p>
                <p className="text-sm text-[var(--text)] mb-1">
                  {plan.protection}
                  {plan.id === 'pro' && (
                    <span className="ml-2 text-xs bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] px-2 py-0.5 rounded">
                      INCLUDED
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Coverage: {plan.protectionCap}</p>
                <p className="text-xs text-[var(--text-muted)]">{plan.claimLimit}</p>
              </div>

              <button
                onClick={() => startSubscription(plan.id as PlanId)}
                disabled={plan.disabled || subscribing === plan.id}
                className={`w-full py-3 rounded-lg transition-colors ${
                  plan.disabled
                    ? 'bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                    : plan.popular
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-3)] text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                {subscribing === plan.id ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </span>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="payouts">
              <AccordionTrigger>How payouts work</AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-[var(--text-muted)] space-y-3">
                  <p>We handle the checkout process and automatically pay both the venue and you. Your take-home percentage is based on the price you set for your artwork.</p>
                  <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Example (Starter, $200 list price)</p>
                    <ul className="mt-2 space-y-1">
                      <li className="flex justify-between"><span>Artist take-home (80%)</span><span>$160.00</span></li>
                      <li className="flex justify-between"><span>Venue commission (15%)</span><span>$30.00</span></li>
                      <li className="flex justify-between"><span>Platform remainder</span><span>$10.00</span></li>
                    </ul>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Buyer fees appear at checkout and support platform operations.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Upgrade Note */}
      <div className="text-center mb-12 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
          <p className="text-sm text-[var(--text)]">
          💡 You can upgrade or downgrade your plan anytime. Changes take effect at the start of your next billing cycle.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={openBillingPortal}
            disabled={managingPortal}
            className={`px-6 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors ${managingPortal ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {managingPortal ? 'Opening Billing Portal…' : 'Manage Subscription'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-[var(--danger)] mt-2">{error}</p>
        )}
      </div>

      {/* Earnings Calculator */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8">
          <h2 className="text-2xl mb-2 text-[var(--text)] flex items-center gap-3">
            <Calculator className="w-7 h-7" />
            Earnings Calculator
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Estimate monthly net income based on sale value and artworks/month (capped by plan limits)
          </p>
          
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6 mb-6">
            <label className="block text-sm text-[var(--text)] font-semibold mb-3">Sale Value ($)</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="0"
                max="2000"
                step="5"
                value={saleValue}
                onChange={(e) => setSaleValue(Number(e.target.value))}
                className="flex-1 h-2 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <input
                type="number"
                value={saleValue}
                onChange={(e) => setSaleValue(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--text)] text-center font-bold"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">Adjust the slider to see how your profit changes across plans</p>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6 mb-6">
            <label className="block text-sm text-[var(--text)] font-semibold mb-3">Artworks / month</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="1"
                max={maxArtworksForCalculatorUI}
                step="1"
                value={artworksPerMonth}
                onChange={(e) => setArtworksPerMonth(Number(e.target.value))}
                className="flex-1 h-2 bg-[var(--surface-3)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <input
                type="number"
                min="1"
                max={maxArtworksForCalculatorUI}
                value={artworksPerMonth}
                onChange={(e) => setArtworksPerMonth(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--text)] text-center font-bold"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              This represents how many artworks you can list/protect and realistically sell in a month.
            </p>
          </div>

          <p className="text-sm text-[var(--text)] mb-3 font-semibold">Click a plan to see your earnings breakdown:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { id: 'free', name: 'Free', takeHome: 60, price: 0, earnings: freeEarnings, monthly: freeMonthly },
              { id: 'starter', name: 'Starter', takeHome: 80, price: 9, earnings: starterEarnings, monthly: starterMonthly },
              { id: 'growth', name: 'Growth', takeHome: 83, price: 19, earnings: growthEarnings, monthly: growthMonthly },
              { id: 'pro', name: 'Pro', takeHome: 85, price: 39, earnings: proEarnings, monthly: proMonthly }
            ].map((plan) => {
              const isSelected = selectedPlanId === plan.id || (!selectedPlanId && plan.id === 'pro');
              const isCapped = plan.monthly.allowedArtworks < artworksPerMonth;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[var(--border)] bg-[var(--surface-3)] shadow-lg'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--text)] mb-2">{plan.name}</div>
                  <div className="text-3xl font-bold text-[var(--text)]">
                    ${formatWhole(plan.monthly.monthlyNet)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    est. net / month
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {plan.id === 'pro'
                      ? `${artworksPerMonth} artworks`
                      : `${plan.monthly.allowedArtworks} of ${artworksPerMonth} artworks`}
                    {isCapped && plan.id !== 'pro' ? ' (capped)' : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedPlanId && (
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="font-bold text-[var(--text)] mb-4 text-lg">
                {selectedPlanId === 'free' && 'Free Plan'}
                {selectedPlanId === 'starter' && 'Starter Plan'}
                {selectedPlanId === 'growth' && 'Growth Plan'}
                {selectedPlanId === 'pro' && 'Pro Plan'}
                {' '}Earnings Breakdown
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Sale Value</span>
                  <span className="font-semibold text-[var(--text)]">${formatWhole(saleValue)}</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Artworks / month</span>
                  <span className="font-semibold text-[var(--text)]">{artworksPerMonth}</span>
                </div>

                {selectedPlanId === 'free' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Artist Earnings (60%)</span>
                      <span className="font-semibold text-[var(--accent)]">${formatCurrency(freeEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Venue Commission (15%)</span>
                      <span className="font-semibold text-[var(--text)]">${formatCurrency(freeEarnings.venueAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                      <span className="font-semibold text-[var(--text)]">$0</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your per-sale earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${formatCurrency(freeEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="bg-[var(--surface-3)] p-4 rounded-lg border border-[var(--border)]">
                      <h4 className="text-sm font-semibold text-[var(--text)] mb-2">After Additional Costs:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                          <span className="text-[var(--text)]">$0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Protection Plan</span>
                          <span className="text-[var(--text)]">$3/artwork/mo</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Est. Net Income / month</span>
                            <span className="text-[var(--text)]">${formatWhole(freeMonthly.monthlyNet)}</span>
                          </div>
                        </div>
                        {freeMonthly.allowedArtworks < artworksPerMonth && (
                          <p className="text-xs text-[var(--text-muted)] mt-2">
                            Limited by plan: Free supports up to {freeMonthly.allowedArtworks} artworks.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'starter' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Artist Earnings (80%)</span>
                      <span className="font-semibold text-[var(--accent)]">${formatCurrency(starterEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Venue Commission (15%)</span>
                      <span className="font-semibold text-[var(--text)]">${formatCurrency(starterEarnings.venueAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                      <span className="font-semibold text-[var(--text)]">$9.00</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your per-sale earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${formatCurrency(starterEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="bg-[var(--surface-3)] p-4 rounded-lg border border-[var(--border)]">
                      <h4 className="text-sm font-semibold text-[var(--text)] mb-2">After Additional Costs:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                          <span className="text-[var(--text)]">-$9</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Protection Plan</span>
                          <span className="text-[var(--text)]">$3/artwork/mo</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Est. Net Income / month</span>
                            <span className="text-[var(--text)]">${formatWhole(starterMonthly.monthlyNet)}</span>
                          </div>
                        </div>
                        {starterMonthly.allowedArtworks < artworksPerMonth && (
                          <p className="text-xs text-[var(--text-muted)] mt-2">
                            Limited by plan: Starter supports up to {starterMonthly.allowedArtworks} artworks.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'growth' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Artist Earnings (83%)</span>
                      <span className="font-semibold text-[var(--accent)]">${formatCurrency(growthEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Venue Commission (15%)</span>
                      <span className="font-semibold text-[var(--text)]">${formatCurrency(growthEarnings.venueAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                      <span className="font-semibold text-[var(--text)]">$19.00</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your per-sale earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${formatCurrency(growthEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="bg-[var(--surface-3)] p-4 rounded-lg border border-[var(--border)]">
                      <h4 className="text-sm font-semibold text-[var(--text)] mb-2">After Additional Costs:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                          <span className="text-[var(--text)]">-$19</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Protection Plan</span>
                          <span className="text-[var(--text)]">$3/artwork/mo</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Est. Net Income / month</span>
                            <span className="text-[var(--text)]">${formatWhole(growthMonthly.monthlyNet)}</span>
                          </div>
                        </div>
                        {growthMonthly.allowedArtworks < artworksPerMonth && (
                          <p className="text-xs text-[var(--text-muted)] mt-2">
                            Limited by plan: Growth supports up to 30 artworks.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'pro' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Artist Earnings (85%)</span>
                      <span className="font-semibold text-[var(--accent)]">${formatCurrency(proEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Venue Commission (15%)</span>
                      <span className="font-semibold text-[var(--text)]">${formatCurrency(proEarnings.venueAmount * 100)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                      <span className="font-semibold text-[var(--text)]">$39.00</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your per-sale earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${formatCurrency(proEarnings.artistAmount * 100)}</span>
                    </div>
                    <div className="bg-[var(--surface-3)] p-4 rounded-lg border border-[var(--border)]">
                      <h4 className="text-sm font-semibold text-[var(--text)] mb-2">After Additional Costs:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                          <span className="text-[var(--text)]">-$39</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Protection Plan</span>
                          <span className="text-[var(--text)]">Included</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Est. Net Income / month</span>
                            <span className="text-[var(--text)]">${formatWhole(proMonthly.monthlyNet)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-4">
                💡 <span className="font-semibold">Pro tip:</span> The Pro plan includes free protection for all your artworks and offers the highest artist take-home (85%) to maximize your earnings!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Protection Plan Details */}
      <div className="max-w-4xl mx-auto mb-12">
        <button
          onClick={() => setShowProtectionDetails(!showProtectionDetails)}
          className="w-full bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-xl mb-1 text-[var(--text)]">Artwork Protection Plan Details</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Learn about coverage, requirements, and exclusions
                </p>
              </div>
            </div>
            <div className="text-[var(--text-muted)]">
              {showProtectionDetails ? '−' : '+'}
            </div>
          </div>
        </button>

        {showProtectionDetails && (
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] border-t-0 p-6 mt-0">
            <div className="space-y-6">
              {/* What's Covered */}
              <div>
                <h3 className="text-base mb-3 text-[var(--text)]">What's Covered</h3>
                <p className="text-sm text-[var(--text)] mb-3">
                  The Artwork Protection Plan helps reimburse you for certain covered incidents while your artwork is displayed through Artwalls placements:
                </p>
                <ul className="space-y-2 text-sm text-[var(--text)]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <span>Accidental damage (spills, bumps, falls)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <span>Theft or vandalism</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <span>Environmental damage (within venue safety guidelines)</span>
                  </li>
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-base mb-3 text-[var(--text)]">Coverage Requirements</h3>
                <ul className="space-y-2 text-sm text-[var(--text)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">•</span>
                    <span><strong>Declared value:</strong> Required per artwork (defaults to sale price)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">•</span>
                    <span><strong>Condition report at install:</strong> 2–4 photos + "Installed in good condition" confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">•</span>
                    <span><strong>Venue safety checklist:</strong> Must be completed (no heaters/steam/grease; sunlight disclosed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">•</span>
                    <span><strong>Incident reporting:</strong> Within 48 hours with photos (close-up + context)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">•</span>
                    <span><strong>Waiting period:</strong> Coverage begins 7 days after plan activation</span>
                  </li>
                </ul>
              </div>

              {/* Exclusions */}
              <div>
                <h3 className="text-base mb-3 text-[var(--text)]">What's NOT Covered (Exclusions)</h3>
                <ul className="space-y-2 text-sm text-[var(--text)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">✕</span>
                    <span>Improper mounting or hardware failure caused by artist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">✕</span>
                    <span>Normal wear and tear</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">✕</span>
                    <span>Damage from disclosed risks that artist accepted (e.g., direct sun disclosed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)] mr-1">✕</span>
                    <span>Intentional damage or fraud</span>
                  </li>
                </ul>
              </div>

              {/* Coverage Caps */}
              <div className="bg-[var(--surface-3)] rounded-lg p-4 border border-[var(--border)]">
                <h3 className="text-base text-[var(--text)] mb-3">Coverage Caps by Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text)] mb-1"><strong>Free & Starter:</strong></p>
                    <p className="text-sm text-[var(--text)]">Up to $100 per incident</p>
                    <p className="text-xs text-[var(--text-muted)]">2 claims per year</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text)] mb-1"><strong>Growth:</strong></p>
                    <p className="text-sm text-[var(--text)]">Up to $150 per incident</p>
                    <p className="text-xs text-[var(--text-muted)]">3 claims per year</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text)] mb-1"><strong>Pro:</strong></p>
                    <p className="text-sm text-[var(--text)]">Up to $200 per incident</p>
                    <p className="text-xs text-[var(--text-muted)]">4 claims per year</p>
                  </div>
                  <div className="bg-[var(--surface-1)] rounded-lg p-3 border border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Protection cost:</p>
                    <p className="text-sm text-[var(--text)]">Free: $5/mo | Others: $3/mo</p>
                    <p className="text-xs text-[var(--text-muted)]">Included on Pro plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout Information by Plan */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-2xl mb-2 text-[var(--text)]">Payout Information by Plan</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Listing and application limits per subscription tier.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'free', name: 'Free', listings: '1', applications: '1/month' },
              { id: 'starter', name: 'Starter', listings: '10', applications: '3/month' },
              { id: 'growth', name: 'Growth', listings: '30', applications: 'Unlimited' },
              { id: 'pro', name: 'Pro', listings: 'Unlimited', applications: 'Unlimited' },
            ].map((p) => (
              <div key={p.id} className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-4">
                <h3 className="text-lg text-[var(--text)] mb-2">{p.name}</h3>
                <div className="text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[var(--text-muted)]">Artwork listings</span>
                    <span className="text-[var(--text)] font-semibold">{p.listings}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[var(--text-muted)]">Venue applications</span>
                    <span className="text-[var(--text)] font-semibold">{p.applications}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Limits apply per billing cycle. Upgrade anytime to increase caps.
          </p>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl mb-6 text-center text-[var(--text)]">Compare All Plans</h2>
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm text-[var(--text-muted)] font-semibold">What You Get</th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">
                  <div>Free</div>
                  <div className="text-xs text-[var(--accent)] font-bold mt-1">60% earnings</div>
                </th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">
                  <div>Starter</div>
                  <div className="text-xs text-[var(--accent)] font-bold mt-1">80% earnings</div>
                </th>
                <th className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)] font-semibold">
                  <div>Growth</div>
                  <div className="text-xs text-[var(--accent)] font-bold mt-1">83% earnings</div>
                </th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">
                  <div>Pro</div>
                  <div className="text-xs text-[var(--accent)] font-bold mt-1">85% earnings</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Monthly subscription</td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>Free</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>$9</strong></td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>$19</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>$39</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Active displays included</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>1</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>4</strong></td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>10</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>Unlimited</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Additional display fee</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text-muted)]">N/A</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$5/mo each</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$4/mo each</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]">Artworks you can list</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">1</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">10</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">30</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Unlimited</td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Sales analytics</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Basic</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>Advanced</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>Advanced</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]">Venue applications per month</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">1</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">3</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">Unlimited</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Unlimited</td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Priority visibility in search results</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>✓</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>✓✓</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Artwork Protection Plan</strong></td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$5/artwork/mo</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$5/artwork/mo</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$3/artwork/mo</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]"><strong>FREE</strong></td>
              </tr>
              <tr>
                <td className="p-4 text-sm text-[var(--text)]">Max coverage per claim</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$100/claim</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$100/claim</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$150/claim</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$200/claim</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl mb-6 text-center text-[var(--text)]">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-base mb-2 text-[var(--text)]">Can I change plans later?</h3>
            <p className="text-sm text-[var(--text)]">
              Yes! You can upgrade or downgrade anytime. Changes take effect at the start of your next billing cycle.
            </p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-base mb-2 text-[var(--text)]">How does the Protection Plan work if I have multiple artworks displayed?</h3>
            <p className="text-sm text-[var(--text)]">
              On Free plan, protection costs $5 per displayed artwork per month. On Starter and Growth plans, it costs $3 per displayed artwork per month. On Pro, protection is included FREE for all displayed artworks. You can toggle protection on/off for each placement.
            </p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-base mb-2 text-[var(--text)]">What's the revenue split on sales?</h3>
            <p className="text-sm text-[var(--text)]">
              Artists receive a percentage of the sale price based on their current subscription plan, while venues always receive 15%. The platform fee is determined by the artist's subscription plan and is applied in addition to this split.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}