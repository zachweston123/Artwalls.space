import { Check, Sparkles, Shield, TrendingUp, Zap, Calculator } from 'lucide-react';
import { useState } from 'react';

interface PricingPageProps {
  onNavigate: (page: string) => void;
  currentPlan?: 'free' | 'starter' | 'growth' | 'pro';
}

export function PricingPage({ onNavigate, currentPlan = 'free' }: PricingPageProps) {
  const [showProtectionDetails, setShowProtectionDetails] = useState(false);
  const [saleValue, setSaleValue] = useState(100);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: '/mo',
      icon: Sparkles,
      features: [
        '1 active display included',
        '1 artwork listing',
        'Up to 1 venue application / month',
        '15% platform fee on sales',
        'Weekly payouts',
        'Basic QR label generation',
      ],
      activeDisplays: 1,
      overagePricing: null,
      platformFee: 15,
      payoutSpeed: 'Weekly',
      protection: 'Optional at $3/artwork/mo',
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
      features: [
        '4 active displays included',
        'Up to 10 artworks',
        'Up to 3 venue applications / month',
        '10% platform fee on sales',
        'Standard payouts',
        'Priority support',
      ],
      activeDisplays: 4,
      overagePricing: '$5/mo per additional display',
      platformFee: 10,
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
      features: [
        '10 active displays included',
        'Up to 30 artworks',
        'Unlimited venue applications',
        '8% platform fee on sales',
        'Standard payouts',
        'Priority visibility boost',
      ],
      activeDisplays: 10,
      overagePricing: '$4/mo per additional display',
      platformFee: 8,
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
      features: [
        'Unlimited active displays',
        'Unlimited artworks',
        'Unlimited applications',
        '6% platform fee on sales',
        'Fast payouts (coming soon)',
        'Featured artist eligibility',
      ],
      activeDisplays: 'Unlimited',
      overagePricing: null,
      platformFee: 6,
      payoutSpeed: 'Fast',
      protection: 'Included FREE',
      protectionCap: '$200 per incident',
      claimLimit: 'Up to 4 claims/year',
      cta: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      popular: false,
      disabled: currentPlan === 'pro',
    },
  ];

  // Calculate earnings for a given plan
  // Earnings = Sale Value - Platform Fee (no subscription costs deducted)
  const calculateEarnings = (saleAmount: number, platformFee: number, subscriptionPrice: number, protectionPlanCost: number = 0) => {
    const platformFeeAmount = saleAmount * (platformFee / 100);
    const earnings = saleAmount - platformFeeAmount; // Earnings from service fee only
    return {
      platformFeeAmount: Math.max(0, platformFeeAmount),
      subscriptionPrice: subscriptionPrice,
      protectionPlanCost: protectionPlanCost,
      earnings: Math.max(0, earnings),
      earningsPercent: saleAmount > 0 ? ((earnings / saleAmount) * 100) : 0
    };
  };

  const freeEarnings = calculateEarnings(saleValue, 15, 0, 3); // Free plan: $3/artwork for protection
  const starterEarnings = calculateEarnings(saleValue, 10, 9, 3); // Starter plan: $3/artwork for protection
  const growthEarnings = calculateEarnings(saleValue, 8, 19, 3); // Growth plan: $3/artwork for protection
  const proEarnings = calculateEarnings(saleValue, 6, 39, 0); // Pro plan: protection included

  return (
    <div className="bg-[var(--bg)]">
      <div className="text-center mb-12">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Plans & Pricing</h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Choose the plan that fits your needs. Upgrade anytime as your art business grows.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6 relative ${
                plan.popular ? 'shadow-lg' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-1 rounded-full text-xs">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--surface-3)] rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-lg text-[var(--text)]">{plan.name}</h3>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl text-[var(--text)]">${plan.price}</span>
                <span className="text-[var(--text-muted)]">{plan.period}</span>
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
                disabled={plan.disabled}
                className={`w-full py-3 rounded-lg transition-colors ${
                  plan.disabled
                    ? 'bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]'
                    : plan.popular
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-3)] text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Upgrade Note */}
      <div className="text-center mb-12 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border)]">
        <p className="text-sm text-[var(--text)]">
          💡 You can upgrade or downgrade your plan anytime. Changes take effect at the start of your next billing cycle.
        </p>
      </div>

      {/* Earnings Calculator */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8">
          <h2 className="text-2xl mb-2 text-[var(--text)] flex items-center gap-3">
            <Calculator className="w-7 h-7" />
            Earnings Calculator
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            See how much you'll earn from a sale before subscription and protection costs
          </p>
          
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-6 mb-6">
            <label className="block text-sm text-[var(--text)] font-semibold mb-3">Sale Value ($)</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="0"
                max="2000"
                step="10"
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

          <p className="text-sm text-[var(--text)] mb-3 font-semibold">Click a plan to see your earnings breakdown:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { id: 'free', name: 'Free', fee: 15, price: 0, earnings: freeEarnings },
              { id: 'starter', name: 'Starter', fee: 10, price: 9, earnings: starterEarnings },
              { id: 'growth', name: 'Growth', fee: 8, price: 19, earnings: growthEarnings },
              { id: 'pro', name: 'Pro', fee: 6, price: 39, earnings: proEarnings }
            ].map((plan) => {
              const isSelected = selectedPlanId === plan.id || (!selectedPlanId && plan.id === 'pro');
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
                    ${plan.earnings.earnings.toFixed(0)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    you earn
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
                  <span className="font-semibold text-[var(--text)]">${saleValue.toFixed(0)}</span>
                </div>

                {selectedPlanId === 'free' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Platform Fee (15%)</span>
                      <span className="font-semibold text-[var(--text)]">-${freeEarnings.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your Earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${freeEarnings.earnings.toFixed(0)}</span>
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
                          <span className="text-[var(--text)]">$3/artwork</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Net Income (1 artwork sold)</span>
                            <span className="text-[var(--text)]">${Math.max(0, freeEarnings.earnings - 3).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'starter' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Platform Fee (10%)</span>
                      <span className="font-semibold text-[var(--text)]">-${starterEarnings.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your Earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${starterEarnings.earnings.toFixed(0)}</span>
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
                          <span className="text-[var(--text)]">$3/artwork</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Net Income (1 artwork sold)</span>
                            <span className="text-[var(--text)]">${Math.max(0, starterEarnings.earnings - 9 - 3).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'growth' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Platform Fee (8%)</span>
                      <span className="font-semibold text-[var(--text)]">-${growthEarnings.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your Earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${growthEarnings.earnings.toFixed(0)}</span>
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
                          <span className="text-[var(--text)]">$3/artwork</span>
                        </div>
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-[var(--text)]">Net Income (1 artwork sold)</span>
                            <span className="text-[var(--text)]">${Math.max(0, growthEarnings.earnings - 19 - 3).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedPlanId === 'pro' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Platform Fee (6%)</span>
                      <span className="font-semibold text-[var(--text)]">-${proEarnings.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-lg mb-4">
                      <span className="font-bold text-[var(--text)]">Your Earnings</span>
                      <span className="font-bold text-[var(--accent)] text-xl">${proEarnings.earnings.toFixed(0)}</span>
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
                            <span className="text-[var(--text)]">Net Income (1 artwork sold)</span>
                            <span className="text-[var(--text)]">${Math.max(0, proEarnings.earnings - 39).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-4">
                💡 <span className="font-semibold">Pro tip:</span> The Pro plan includes free protection for all your artworks and offers the lowest platform fee (6%) to maximize your earnings!
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
                    <p className="text-sm text-[var(--text)]">$3/artwork/mo</p>
                    <p className="text-xs text-[var(--text-muted)]">Included on Pro plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl mb-6 text-center text-[var(--text)]">Compare All Features</h2>
        <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-4 text-sm text-[var(--text-muted)] font-semibold">Feature</th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">Free</th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">Starter</th>
                <th className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)] font-semibold">Growth</th>
                <th className="text-center p-4 text-sm text-[var(--text-muted)] font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Active displays included</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>1</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>4</strong></td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>10</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>Unlimited</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Overage pricing</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text-muted)]">—</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text-muted)]">$5/mo per display</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$4/mo per display</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text-muted)]">—</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]">Artwork listings</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">1</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">10</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">30</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Unlimited</td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Venue applications</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">1/month</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">3/month</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">Unlimited</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Unlimited</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Platform fee on sales</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>15%</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>10%</strong></td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]"><strong>8%</strong></td>
                <td className="text-center p-4 text-sm text-[var(--text)]"><strong>6%</strong></td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Payout speed</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">Weekly</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">Standard</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">Standard</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">Fast</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]">Analytics</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Basic</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">Advanced</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">Advanced</td>
              </tr>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)]">
                <td className="p-4 text-sm text-[var(--text)]">Priority visibility</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">—</td>
                <td className="text-center p-4 text-sm bg-[var(--surface-3)] text-[var(--text)]">✓</td>
                <td className="text-center p-4 text-sm text-[var(--text)]">✓✓</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-4 text-sm text-[var(--text)]"><strong>Protection Plan</strong></td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]"><strong>INCLUDED</strong></td>
              </tr>
              <tr>
                <td className="p-4 text-sm text-[var(--text)]">Protection cap</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$100</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$100</td>
                <td className="text-center p-4 text-sm text-xs bg-[var(--surface-3)] text-[var(--text)]">$150</td>
                <td className="text-center p-4 text-sm text-xs text-[var(--text)]">$200</td>
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
              On Free, Starter, and Growth plans, protection costs $3 per displayed artwork per month. On Pro, protection is included FREE for all displayed artworks. You can toggle protection on/off for each placement.
            </p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-base mb-2 text-[var(--text)]">What's the revenue split on sales?</h3>
            <p className="text-sm text-[var(--text)]">
              Artists receive a percentage of the sale price based on their current subscription plan, while venues always receive 10%. The platform fee is determined by the artist's subscription plan and is applied in addition to this split.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}