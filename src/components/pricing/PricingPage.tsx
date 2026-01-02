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

  // Calculate profit for a given plan
  const calculateProfit = (saleAmount: number, platformFee: number, subscriptionPrice: number) => {
    const platformFeeAmount = saleAmount * (platformFee / 100);
    const profit = saleAmount - platformFeeAmount - subscriptionPrice;
    return {
      platformFeeAmount: Math.max(0, platformFeeAmount),
      subscriptionPrice: subscriptionPrice,
      profit: Math.max(0, profit),
      profitPercent: saleAmount > 0 ? ((profit / saleAmount) * 100) : 0
    };
  };

  const freeProfit = calculateProfit(saleValue, 15, 0);
  const starterProfit = calculateProfit(saleValue, 10, 9);
  const growthProfit = calculateProfit(saleValue, 8, 19);
  const proProfit = calculateProfit(saleValue, 6, 39);

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Plans & Pricing</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
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
              className={`bg-white dark:bg-neutral-800 rounded-xl border-2 p-6 relative ${
                plan.popular
                  ? 'border-blue-600 dark:border-blue-500 shadow-lg'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-1 rounded-full text-xs">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg text-neutral-900 dark:text-neutral-50">{plan.name}</h3>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl text-neutral-900 dark:text-neutral-50">${plan.price}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mb-6">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Artwork Protection Plan:</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-50 mb-1">
                  {plan.protection}
                  {plan.id === 'pro' && (
                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                      INCLUDED
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Coverage: {plan.protectionCap}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{plan.claimLimit}</p>
              </div>

              <button
                disabled={plan.disabled}
                className={`w-full py-3 rounded-lg transition-colors ${
                  plan.disabled
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Upgrade Note */}
      <div className="text-center mb-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          💡 You can upgrade or downgrade your plan anytime. Changes take effect at the start of your next billing cycle.
        </p>
      </div>

      {/* Earnings Calculator */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-gradient-to-br from-blue-600 to-green-600 dark:from-blue-700 dark:to-green-700 rounded-xl p-8 text-white">
          <h2 className="text-2xl mb-2 text-white flex items-center gap-3">
            <Calculator className="w-7 h-7" />
            Earnings Calculator
          </h2>
          <p className="text-sm text-white/90 mb-6">
            See how much profit you'll keep from a sale with each plan
          </p>
          
          <div className="bg-white dark:bg-neutral-900 backdrop-blur rounded-lg p-6 mb-6">
            <label className="block text-sm text-neutral-900 dark:text-neutral-50 font-semibold mb-3">Sale Value ($)</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="0"
                max="2000"
                step="10"
                value={saleValue}
                onChange={(e) => setSaleValue(Number(e.target.value))}
                className="flex-1 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <input
                type="number"
                value={saleValue}
                onChange={(e) => setSaleValue(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-neutral-50 text-center font-bold"
              />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Adjust the slider to see how your profit changes across plans</p>
          </div>

          <p className="text-sm text-white/90 mb-3 font-semibold">Click a plan to see your profit breakdown:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { id: 'free', name: 'Free', fee: 15, price: 0, profit: freeProfit },
              { id: 'starter', name: 'Starter', fee: 10, price: 9, profit: starterProfit },
              { id: 'growth', name: 'Growth', fee: 8, price: 19, profit: growthProfit },
              { id: 'pro', name: 'Pro', fee: 6, price: 39, profit: proProfit }
            ].map((plan) => {
              const isSelected = selectedPlanId === plan.id || (!selectedPlanId && plan.id === 'starter');
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-white bg-white/20 ring-2 ring-white shadow-lg'
                      : 'border-white/30 hover:border-white/60 bg-white/5'
                  }`}
                >
                  <div className="font-semibold text-white mb-2">{plan.name}</div>
                  <div className="text-3xl font-bold text-white">
                    ${plan.profit.profit.toFixed(0)}
                  </div>
                  <div className="text-xs text-white/80 mt-1">
                    you keep
                  </div>
                </button>
              );
            })}
          </div>

          {selectedPlanId && (
            <div className="bg-white dark:bg-neutral-900 backdrop-blur rounded-lg p-6">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4 text-lg">
                {selectedPlanId === 'free' && 'Free Plan'}
                {selectedPlanId === 'starter' && 'Starter Plan'}
                {selectedPlanId === 'growth' && 'Growth Plan'}
                {selectedPlanId === 'pro' && 'Pro Plan'}
                {' '}Profit Breakdown
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-700 dark:text-neutral-400">Sale Value</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">${saleValue.toFixed(0)}</span>
                </div>

                {selectedPlanId === 'free' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Platform Fee (15%)</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${freeProfit.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Monthly Subscription</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">$0</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                      <span className="font-bold text-neutral-900 dark:text-white">Your Profit</span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-xl">${freeProfit.profit.toFixed(0)}</span>
                    </div>
                  </>
                )}

                {selectedPlanId === 'starter' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Platform Fee (10%)</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${starterProfit.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Monthly Subscription</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${starterProfit.subscriptionPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                      <span className="font-bold text-neutral-900 dark:text-white">Your Profit</span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-xl">${starterProfit.profit.toFixed(0)}</span>
                    </div>
                  </>
                )}

                {selectedPlanId === 'growth' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Platform Fee (8%)</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${growthProfit.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Monthly Subscription</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${growthProfit.subscriptionPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                      <span className="font-bold text-neutral-900 dark:text-white">Your Profit</span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-xl">${growthProfit.profit.toFixed(0)}</span>
                    </div>
                  </>
                )}

                {selectedPlanId === 'pro' && (
                  <>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Platform Fee (6%)</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${proProfit.platformFeeAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
                      <span className="text-neutral-700 dark:text-neutral-400">Monthly Subscription</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-${proProfit.subscriptionPrice.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
                      <span className="font-bold text-neutral-900 dark:text-white">Your Profit</span>
                      <span className="font-bold text-green-700 dark:text-green-400 text-xl">${proProfit.profit.toFixed(0)}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-4">
                💡 <span className="font-semibold">Pro tip:</span> Higher tiers pay for themselves through lower fees as you grow!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Protection Plan Details */}
      <div className="max-w-4xl mx-auto mb-12">
        <button
          onClick={() => setShowProtectionDetails(!showProtectionDetails)}
          className="w-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 text-left hover:shadow-md dark:hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl mb-1 text-neutral-900 dark:text-neutral-50">Artwork Protection Plan Details</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Learn about coverage, requirements, and exclusions
                </p>
              </div>
            </div>
            <div className="text-neutral-400 dark:text-neutral-600">
              {showProtectionDetails ? '−' : '+'}
            </div>
          </div>
        </button>

        {showProtectionDetails && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 border-t-0 p-6 mt-0">
            <div className="space-y-6">
              {/* What's Covered */}
              <div>
                <h3 className="text-base mb-3 text-neutral-900 dark:text-neutral-50">What's Covered</h3>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                  The Artwork Protection Plan helps reimburse you for certain covered incidents while your artwork is displayed through Artwalls placements:
                </p>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Accidental damage (spills, bumps, falls)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Theft or vandalism</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Environmental damage (within venue safety guidelines)</span>
                  </li>
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-base mb-3 text-neutral-900 dark:text-neutral-50">Coverage Requirements</h3>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mr-1">•</span>
                    <span><strong>Declared value:</strong> Required per artwork (defaults to sale price)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mr-1">•</span>
                    <span><strong>Condition report at install:</strong> 2–4 photos + "Installed in good condition" confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mr-1">•</span>
                    <span><strong>Venue safety checklist:</strong> Must be completed (no heaters/steam/grease; sunlight disclosed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mr-1">•</span>
                    <span><strong>Incident reporting:</strong> Within 48 hours with photos (close-up + context)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mr-1">•</span>
                    <span><strong>Waiting period:</strong> Coverage begins 7 days after plan activation</span>
                  </li>
                </ul>
              </div>

              {/* Exclusions */}
              <div>
                <h3 className="text-base mb-3 text-neutral-900 dark:text-neutral-50">What's NOT Covered (Exclusions)</h3>
                <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 mr-1">✕</span>
                    <span>Improper mounting or hardware failure caused by artist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 mr-1">✕</span>
                    <span>Normal wear and tear</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 mr-1">✕</span>
                    <span>Damage from disclosed risks that artist accepted (e.g., direct sun disclosed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 mr-1">✕</span>
                    <span>Intentional damage or fraud</span>
                  </li>
                </ul>
              </div>

              {/* Coverage Caps */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <h3 className="text-base text-blue-900 dark:text-blue-300 mb-3">Coverage Caps by Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1"><strong>Free & Starter:</strong></p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Up to $100 per incident</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">2 claims per year</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1"><strong>Growth:</strong></p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Up to $150 per incident</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">3 claims per year</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1"><strong>Pro:</strong></p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Up to $200 per incident</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">4 claims per year</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-neutral-600 mb-1">Protection cost:</p>
                    <p className="text-sm text-neutral-900">$3/artwork/mo</p>
                    <p className="text-xs text-green-600">FREE on Pro plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl mb-6 text-center text-neutral-900">Compare All Features</h2>
        <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left p-4 text-sm text-neutral-600">Feature</th>
                <th className="text-center p-4 text-sm">Free</th>
                <th className="text-center p-4 text-sm">Starter</th>
                <th className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">Growth</th>
                <th className="text-center p-4 text-sm">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200 bg-purple-50">
                <td className="p-4 text-sm"><strong>Active displays included</strong></td>
                <td className="text-center p-4 text-sm"><strong>1</strong></td>
                <td className="text-center p-4 text-sm"><strong>4</strong></td>
                <td className="text-center p-4 text-sm bg-blue-100"><strong>10</strong></td>
                <td className="text-center p-4 text-sm"><strong>Unlimited</strong></td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Overage pricing</td>
                <td className="text-center p-4 text-sm text-xs">—</td>
                <td className="text-center p-4 text-sm text-xs">$5/mo per display</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50">$4/mo per display</td>
                <td className="text-center p-4 text-sm text-xs">—</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Artwork listings</td>
                <td className="text-center p-4 text-sm">1</td>
                <td className="text-center p-4 text-sm">10</td>
                <td className="text-center p-4 text-sm bg-blue-50">30</td>
                <td className="text-center p-4 text-sm">Unlimited</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Venue applications</td>
                <td className="text-center p-4 text-sm">1/month</td>
                <td className="text-center p-4 text-sm">3/month</td>
                <td className="text-center p-4 text-sm bg-blue-50">Unlimited</td>
                <td className="text-center p-4 text-sm">Unlimited</td>
              </tr>
              <tr className="border-b border-neutral-200 bg-yellow-50">
                <td className="p-4 text-sm"><strong>Platform fee on sales</strong></td>
                <td className="text-center p-4 text-sm"><strong>15%</strong></td>
                <td className="text-center p-4 text-sm"><strong>10%</strong></td>
                <td className="text-center p-4 text-sm bg-blue-100"><strong>8%</strong></td>
                <td className="text-center p-4 text-sm"><strong>6%</strong></td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Payout speed</td>
                <td className="text-center p-4 text-sm text-xs">Weekly</td>
                <td className="text-center p-4 text-sm text-xs">Standard</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50">Standard</td>
                <td className="text-center p-4 text-sm text-xs">Fast</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Analytics</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm">Basic</td>
                <td className="text-center p-4 text-sm bg-blue-50">Advanced</td>
                <td className="text-center p-4 text-sm">Advanced</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="p-4 text-sm">Priority visibility</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm bg-blue-50">✓</td>
                <td className="text-center p-4 text-sm">✓✓</td>
              </tr>
              <tr className="border-b border-neutral-200 bg-green-50">
                <td className="p-4 text-sm"><strong>Protection Plan</strong></td>
                <td className="text-center p-4 text-sm text-xs">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs"><strong>INCLUDED</strong></td>
              </tr>
              <tr>
                <td className="p-4 text-sm">Protection cap</td>
                <td className="text-center p-4 text-sm text-xs">$100</td>
                <td className="text-center p-4 text-sm text-xs">$100</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50 dark:bg-blue-900/30">$150</td>
                <td className="text-center p-4 text-sm text-xs">$200</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl mb-6 text-center text-neutral-900">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-base mb-2 text-neutral-900">Can I change plans later?</h3>
            <p className="text-sm text-neutral-700">
              Yes! You can upgrade or downgrade anytime. Changes take effect at the start of your next billing cycle.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-base mb-2 text-neutral-900">How does the Protection Plan work if I have multiple artworks displayed?</h3>
            <p className="text-sm text-neutral-700">
              On Free, Starter, and Growth plans, protection costs $3 per displayed artwork per month. On Pro, protection is included FREE for all displayed artworks. You can toggle protection on/off for each placement.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-base mb-2 text-neutral-900">What's the revenue split on sales?</h3>
            <p className="text-sm text-neutral-700">
              Artists receive a percentage of the sale price based on their current subscription plan, while venues always receive 10%. The platform fee is determined by the artist's subscription plan and is applied in addition to this split.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}