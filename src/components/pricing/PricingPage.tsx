import { Check, Sparkles, Shield, TrendingUp, Zap, Calculator, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiPost } from '../../lib/api';
import { PRICING_COPY } from '../../lib/feeCopy';
import { trackEvent } from '../../lib/trackEvent';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { EarningsComparisonBlurb } from './EarningsComparisonBlurb';

interface PricingPageProps {
  onNavigate: (page: string) => void;
  currentPlan?: 'free' | 'starter' | 'growth' | 'pro';
}

export function PricingPage({ onNavigate, currentPlan = 'free' }: PricingPageProps) {
  const [showProtectionDetails, setShowProtectionDetails] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [saleValue, setSaleValue] = useState(100);
  const [artworksPerMonth, setArtworksPerMonth] = useState(5);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState<boolean>(false);

  // Track plan_viewed on mount
  useEffect(() => {
    trackEvent({ event_type: 'artwork_view', metadata: { page: 'pricing', action: 'plan_viewed' } });
  }, []);

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
      platformFee: '25%',
      features: [
        '1 active artwork',
        '1 active display',
        'Basic QR code generation',
        'Weekly payouts',
      ],
      activeDisplays: 1,
      artworks: 1,
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
      platformFee: '5%',
      features: [
        'Up to 10 artworks',
        '4 active displays',
        'Priority support',
        'Standard payouts',
      ],
      activeDisplays: 4,
      artworks: 10,
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
      platformFee: '2%',
      features: [
        'Up to 30 artworks',
        '10 active displays',
        'Unlimited venue applications',
        'Priority visibility in search',
      ],
      activeDisplays: 10,
      artworks: 30,
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
      platformFee: '0%',
      features: [
        'Unlimited artworks',
        'Unlimited active displays',
        'Free Artwork Protection',
        'Featured artist eligibility',
      ],
      activeDisplays: 'Unlimited',
      artworks: 'Unlimited',
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

  // Example breakdown for the $140 expandable section
  const examplePrice = 140;
  const exampleBreakdowns = [
    { name: 'Free', pct: 60, take: examplePrice * 0.60 },
    { name: 'Starter', pct: 80, take: examplePrice * 0.80 },
    { name: 'Growth', pct: 83, take: examplePrice * 0.83 },
    { name: 'Pro', pct: 85, take: examplePrice * 0.85 },
  ];

  async function startSubscription(tier: PlanId) {
    if (tier === 'free') return;
    setError(null);
    setSubscribing(tier);
    // Analytics: upgrade_clicked
    trackEvent({ event_type: 'checkout_start', metadata: { action: 'upgrade_clicked', tier } });
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
      // Analytics: checkout_started
      trackEvent({ event_type: 'checkout_start', metadata: { action: 'checkout_started', tier: mappedTier } });
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
    <div className="bg-[var(--bg)] pb-16">
      {/* Hero Header */}
      <div className="text-center mb-10 pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-[var(--text)]">Plans & Pricing</h1>
        <p className="text-[var(--text-muted)] max-w-xl mx-auto text-base sm:text-lg">
          Keep more of every sale. Upgrade anytime as your art business grows.
        </p>
      </div>

      <EarningsComparisonBlurb variant="pricing" />

      {/* ── Plan Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-8 mb-12 px-2 sm:px-4 lg:px-1">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative ${plan.popular ? 'pt-3' : ''}`}
            >
              {/* "Most Popular" badge — sits in the outer wrapper so it's never clipped */}
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-[var(--accent)] text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md">
                  Most Popular
                </div>
              )}
              <div
                className={`bg-[var(--surface-1)] rounded-xl border shadow-sm p-5 sm:p-6 flex flex-col h-full transition-all duration-200 ${
                  plan.popular
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-lg lg:scale-[1.03]'
                    : 'border-[var(--border)] hover:ring-2 hover:ring-[var(--blue)]/20 hover:shadow-md'
                } focus-within:ring-2 focus-within:ring-[var(--blue)]/30`}
              >

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--text)]">{plan.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{plan.tagline}</p>
                </div>
                <Icon className="w-7 h-7 text-[var(--accent)] flex-shrink-0" />
              </div>

              {/* ★ PRIMARY VALUE — Take Home % */}
              <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg p-3 mb-4 text-center">
                <div className="text-3xl font-extrabold text-[var(--accent)] leading-tight">{plan.takeHome}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{PRICING_COPY.takeHomeLabel} {PRICING_COPY.takeHomeSubtext}</div>
              </div>

              {/* Price */}
              <div className="mb-4 text-center">
                <span className="text-2xl font-bold text-[var(--text)]">{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                <span className="text-[var(--text-muted)] ml-1 text-sm">{plan.period}</span>
              </div>

              {/* Secondary — Limits */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-[var(--surface-1)] rounded-md p-2 text-center border border-[var(--border)]">
                  <div className="font-semibold text-[var(--text)]">{plan.artworks}</div>
                  <div className="text-[var(--text-muted)]">Artworks</div>
                </div>
                <div className="bg-[var(--surface-1)] rounded-md p-2 text-center border border-[var(--border)]">
                  <div className="font-semibold text-[var(--text)]">{plan.activeDisplays}</div>
                  <div className="text-[var(--text-muted)]">Displays</div>
                </div>
              </div>

              {/* Secondary — Platform fee label */}
              <div className="text-xs text-center text-[var(--text-muted)] mb-3">
                Platform + Processing: <span className="font-semibold text-[var(--text)]">{plan.platformFee}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--text)]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => startSubscription(plan.id as PlanId)}
                disabled={plan.disabled || subscribing === plan.id}
                className={`w-full py-3 rounded-lg transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                  plan.disabled
                    ? 'bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                    : plan.popular
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md hover:brightness-95'
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
            </div>
          );
        })}
      </div>

      {/* ── Example at $140 (expandable) ────────────────── */}
      <div className="max-w-3xl mx-auto mb-12">
        <button
          onClick={() => setShowExample(!showExample)}
          className="w-full flex items-center justify-between bg-[var(--surface-2)] rounded-xl border border-[var(--border)] px-5 py-4 hover:shadow-sm transition-shadow"
        >
          <span className="text-sm font-semibold text-[var(--text)]">💰 Example: What you take home on a $140 sale</span>
          {showExample ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
        </button>
        {showExample && (
          <div className="bg-[var(--surface-2)] rounded-b-xl border border-t-0 border-[var(--border)] p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {exampleBreakdowns.map((b) => (
                <div key={b.name} className="bg-[var(--surface-1)] rounded-lg border border-[var(--border)] p-3 text-center">
                  <div className="text-xs text-[var(--text-muted)] mb-1">{b.name} ({b.pct}%)</div>
                  <div className="text-xl font-bold text-[var(--accent)]">${b.take.toFixed(2)}</div>
                  <div className="text-xs text-[var(--text-muted)]">take-home</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
              Venue always receives 15%. Buyer pays a 4.5% service fee at checkout. Remaining % is Platform + Processing.
            </p>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-5 sm:p-6">
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

      {/* Manage Subscription */}
      <div className="text-center mb-12 bg-[var(--surface-2)] rounded-xl p-5 sm:p-6 border border-[var(--border)] max-w-2xl mx-auto">
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
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl mb-2 text-[var(--text)] flex items-center gap-3">
            <Calculator className="w-6 h-6" />
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
                  className={`p-4 rounded-xl border transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
                    isSelected
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25 bg-[var(--surface-3)] shadow-md'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:ring-2 hover:ring-[var(--blue)]/20 hover:shadow-sm'
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

          {selectedPlanId && (() => {
            const allData: Record<string, { earnings: ReturnType<typeof calculateArtistTakeHome>; monthly: ReturnType<typeof calculateMonthlyNet>; label: string; sub: number; protLabel: string }> = {
              free: { earnings: freeEarnings, monthly: freeMonthly, label: 'Free Plan', sub: 0, protLabel: '$3/artwork/mo' },
              starter: { earnings: starterEarnings, monthly: starterMonthly, label: 'Starter Plan', sub: 9, protLabel: '$3/artwork/mo' },
              growth: { earnings: growthEarnings, monthly: growthMonthly, label: 'Growth Plan', sub: 19, protLabel: '$3/artwork/mo' },
              pro: { earnings: proEarnings, monthly: proMonthly, label: 'Pro Plan', sub: 39, protLabel: 'Included' },
            };
            const d = allData[selectedPlanId];
            if (!d) return null;
            return (
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4 sm:p-6">
                <h3 className="font-bold text-[var(--text)] mb-4 text-base sm:text-lg">{d.label} Earnings Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                    <span className="text-[var(--text-muted)] text-sm">Sale Value</span>
                    <span className="font-semibold text-[var(--text)]">${formatWhole(saleValue)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                    <span className="text-[var(--text-muted)] text-sm">Artist Earnings ({d.earnings.artistPct}%)</span>
                    <span className="font-semibold text-[var(--accent)]">${formatCurrency(d.earnings.artistAmount * 100)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                    <span className="text-[var(--text-muted)] text-sm">Venue Commission (15%)</span>
                    <span className="font-semibold text-[var(--text)]">${formatCurrency(d.earnings.venueAmount * 100)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-2">
                    <span className="font-bold text-[var(--text)] text-sm">Your per-sale earnings</span>
                    <span className="font-bold text-[var(--accent)] text-xl">${formatCurrency(d.earnings.artistAmount * 100)}</span>
                  </div>
                  <div className="bg-[var(--surface-3)] p-4 rounded-lg border border-[var(--border)]">
                    <h4 className="text-sm font-semibold text-[var(--text)] mb-2">After Additional Costs:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Monthly Subscription</span>
                        <span className="text-[var(--text)]">{d.sub === 0 ? '$0' : `-$${d.sub}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Protection Plan</span>
                        <span className="text-[var(--text)]">{d.protLabel}</span>
                      </div>
                      <div className="border-t border-[var(--border)] pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-[var(--text)]">Est. Net Income / month</span>
                          <span className="text-[var(--text)]">${formatWhole(d.monthly.monthlyNet)}</span>
                        </div>
                      </div>
                      {d.monthly.allowedArtworks < artworksPerMonth && (
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          Limited by plan: supports up to {d.monthly.artworkLimit === Number.POSITIVE_INFINITY ? 'unlimited' : d.monthly.artworkLimit} artworks.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-4">
                  💡 <span className="font-semibold">Pro tip:</span> The Pro plan includes free protection for all your artworks and offers the highest artist take-home (85%) to maximize your earnings!
                </p>
              </div>
            );
          })()}
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
              {showProtectionDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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

      {/* Feature Comparison */}
      <div className="max-w-6xl mx-auto mb-12">
        <h2 className="text-xl sm:text-2xl mb-6 text-center text-[var(--text)]">Compare All Plans</h2>

        {/* Comparison table — single surface, zebra + subtle dividers via CSS */}
        <div className="compareTable rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left px-6 py-5 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center px-6 py-5 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      <div style={p.popular ? { color: 'var(--text)' } : undefined}>{p.name}</div>
                      <div className="text-xs font-bold mt-1" style={{ color: 'var(--accent)' }}>{p.takeHome}% take-home</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Monthly price', values: ['Free', '$9', '$19', '$39'] },
                  { label: 'Artworks listed', values: ['1', '10', '30', 'Unlimited'] },
                  { label: 'Active displays', values: ['1', '4', '10', 'Unlimited'] },
                  { label: 'Extra display fee', values: ['N/A', '$5/mo', '$4/mo', '—'] },
                  { label: 'Venue applications/mo', values: ['1', '3', 'Unlimited', 'Unlimited'] },
                  { label: 'Sales analytics', values: ['—', 'Basic', 'Advanced', 'Advanced'] },
                  { label: 'Priority visibility', values: ['—', '—', '✓', '✓✓'] },
                  { label: 'Protection plan', values: ['$5/art/mo', '$5/art/mo', '$3/art/mo', 'FREE'] },
                  { label: 'Max coverage/claim', values: ['$100', '$100', '$150', '$200'] },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text)' }}>{row.label}</td>
                    {row.values.map((val, j) => (
                      <td key={j} className="text-center px-6 py-4 text-sm tabular-nums" style={{ color: 'var(--text)' }}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl mb-6 text-center text-[var(--text)]">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-6">
          {[
            {
              q: 'Can I upgrade or downgrade anytime?',
              a: "Yes — change your plan at any time from your account settings. Upgrades take effect immediately and you'll be prorated. Downgrades take effect at the start of your next billing cycle.",
            },
            {
              q: 'Can I cancel anytime?',
              a: "Absolutely. There are no long-term contracts. Cancel from your account settings and you'll keep access through the end of your current billing period.",
            },
            {
              q: 'What does \"Platform + Processing\" mean?',
              a: "Every sale has two fees: the platform fee (which decreases as you upgrade) and a fixed 4.5% payment processing fee charged by Stripe. For example, on the Growth plan, the platform fee is just 2% — so the total taken from a sale is 6.5%. The rest goes to you and the venue.",
            },
            {
              q: 'How does the Protection Plan work?',
              a: 'The Protection Plan covers accidental damage, theft, and vandalism while your artwork is displayed through Artwalls. Coverage caps vary by plan ($100–$200 per claim). Pro members get it free — everyone else can add it per artwork.',
            },
            {
              q: 'When do I get paid?',
              a: 'Payouts are processed through Stripe Connect. Once you connect your bank account, earnings are deposited on a rolling basis — typically within 2–7 business days after a sale.',
            },
          ].map((faq) => (
            <div key={faq.q} className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm sm:text-base mb-2 font-semibold" style={{ color: 'var(--text)' }}>{faq.q}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}