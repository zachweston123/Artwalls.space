import { Check, Sparkles, Shield, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';

interface PricingPageProps {
  onNavigate: (page: string) => void;
  currentPlan?: 'free' | 'starter' | 'growth' | 'pro';
}

export function PricingPage({ onNavigate, currentPlan = 'free' }: PricingPageProps) {
  const [showProtectionDetails, setShowProtectionDetails] = useState(false);
  const [monthlySales, setMonthlySales] = useState(300);

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

  // Break-even calculator
  const calculateFees = (sales: number, platformFee: number) => {
    return sales * (platformFee / 100);
  };

  const freeFee = calculateFees(monthlySales, 15);
  const starterFee = calculateFees(monthlySales, 10) + 9;
  const growthFee = calculateFees(monthlySales, 8) + 19;
  const proFee = calculateFees(monthlySales, 6) + 39;

  const getRecommendedPlan = () => {
    const costs = [
      { plan: 'Free', cost: freeFee },
      { plan: 'Starter', cost: starterFee },
      { plan: 'Growth', cost: growthFee },
      { plan: 'Pro', cost: proFee },
    ];
    return costs.reduce((min, curr) => curr.cost < min.cost ? curr : min).plan;
  };

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-3xl mb-2 text-neutral-900 dark:text-neutral-50">Plans & Pricing</h1>
        <p className="text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
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
                  ? 'border-blue-600 shadow-lg'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs">
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
                <span className="text-3xl">${plan.price}</span>
                <span className="text-neutral-600 dark:text-neutral-300">{plan.period}</span>
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
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-2">Artwork Protection Plan:</p>
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
                    ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Upgrade Note */}
      <div className="text-center mb-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          💡 You can upgrade or downgrade your plan anytime. Changes take effect at the start of your next billing cycle.
        </p>
      </div>

      {/* Break-Even Calculator */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <h2 className="text-2xl mb-2 text-neutral-900 dark:text-neutral-50">Which plan pays for itself?</h2>
          <p className="text-sm text-white/90 mb-6">
            Use this calculator to see which plan saves you the most money based on your monthly sales.
          </p>
          
          <div className="bg-white dark:bg-neutral-800/10 backdrop-blur rounded-lg p-6 mb-6">
            <label className="block text-sm mb-3">Your monthly sales</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="flex-1 h-2 bg-white dark:bg-neutral-800/20 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white dark:bg-neutral-800/20 border border-white/30 rounded-lg text-white text-center"
              />
            </div>
            <p className="text-2xl mb-1">${monthlySales.toLocaleString()}/month</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-neutral-800/10 backdrop-blur rounded-lg p-4">
              <p className="text-xs text-white/80 mb-1">Free</p>
              <p className="text-xl mb-1">${freeFee.toFixed(0)}</p>
              <p className="text-xs text-white/70">total cost/mo</p>
            </div>
            <div className="bg-white dark:bg-neutral-800/10 backdrop-blur rounded-lg p-4">
              <p className="text-xs text-white/80 mb-1">Starter</p>
              <p className="text-xl mb-1">${starterFee.toFixed(0)}</p>
              <p className="text-xs text-white/70">total cost/mo</p>
            </div>
            <div className="bg-white dark:bg-neutral-800/10 backdrop-blur rounded-lg p-4">
              <p className="text-xs text-white/80 mb-1">Growth</p>
              <p className="text-xl mb-1">${growthFee.toFixed(0)}</p>
              <p className="text-xs text-white/70">total cost/mo</p>
            </div>
            <div className="bg-white dark:bg-neutral-800/10 backdrop-blur rounded-lg p-4">
              <p className="text-xs text-white/80 mb-1">Pro</p>
              <p className="text-xl mb-1">${proFee.toFixed(0)}</p>
              <p className="text-xs text-white/70">total cost/mo</p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800/20 backdrop-blur rounded-lg p-4 mb-4">
            <p className="text-sm mb-2">
              💡 <strong>Recommended plan:</strong> {getRecommendedPlan()}
            </p>
            <p className="text-xs text-white/80">
              Approximate break-evens: Starter ≈ $180/mo sales • Growth ≈ $272/mo • Pro ≈ $433/mo
            </p>
          </div>

          <p className="text-xs text-white/60">
            * Estimates exclude payment processing fees. Based on platform fee differences vs Free plan.
          </p>
        </div>
      </div>

      {/* Protection Plan Details */}
      <div className="max-w-4xl mx-auto mb-12">
        <button
          onClick={() => setShowProtectionDetails(!showProtectionDetails)}
          className="w-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl mb-1 text-neutral-900 dark:text-neutral-50">Artwork Protection Plan Details</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Learn about coverage, requirements, and exclusions
                </p>
              </div>
            </div>
            <div className="text-neutral-400 dark:text-neutral-500">
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
                    <span className="text-blue-600 dark:text-blue-400 mr-1">•</span>
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
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                <h3 className="text-base text-blue-900 dark:text-blue-200 mb-3 text-neutral-900 dark:text-neutral-50">Coverage Caps by Plan</h3>
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
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">Protection cost:</p>
                    <p className="text-sm text-neutral-900 dark:text-neutral-50">$3/artwork/mo</p>
                    <p className="text-xs text-green-600 dark:text-green-400">FREE on Pro plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl mb-6 text-center text-neutral-900 dark:text-neutral-50">Compare All Features</h2>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left p-4 text-sm text-neutral-600 dark:text-neutral-300">Feature</th>
                <th className="text-center p-4 text-sm">Free</th>
                <th className="text-center p-4 text-sm">Starter</th>
                <th className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">Growth</th>
                <th className="text-center p-4 text-sm">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-purple-50">
                <td className="p-4 text-sm"><strong>Active displays included</strong></td>
                <td className="text-center p-4 text-sm"><strong>1</strong></td>
                <td className="text-center p-4 text-sm"><strong>4</strong></td>
                <td className="text-center p-4 text-sm bg-blue-100 dark:bg-blue-900"><strong>10</strong></td>
                <td className="text-center p-4 text-sm"><strong>Unlimited</strong></td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Overage pricing</td>
                <td className="text-center p-4 text-sm text-xs">—</td>
                <td className="text-center p-4 text-sm text-xs">$5/mo per display</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50 dark:bg-blue-900/30">$4/mo per display</td>
                <td className="text-center p-4 text-sm text-xs">—</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Artwork listings</td>
                <td className="text-center p-4 text-sm">1</td>
                <td className="text-center p-4 text-sm">10</td>
                <td className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">30</td>
                <td className="text-center p-4 text-sm">Unlimited</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Venue applications</td>
                <td className="text-center p-4 text-sm">1/month</td>
                <td className="text-center p-4 text-sm">3/month</td>
                <td className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">Unlimited</td>
                <td className="text-center p-4 text-sm">Unlimited</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-yellow-50 dark:bg-yellow-900/30">
                <td className="p-4 text-sm"><strong>Platform fee on sales</strong></td>
                <td className="text-center p-4 text-sm"><strong>15%</strong></td>
                <td className="text-center p-4 text-sm"><strong>10%</strong></td>
                <td className="text-center p-4 text-sm bg-blue-100 dark:bg-blue-900"><strong>8%</strong></td>
                <td className="text-center p-4 text-sm"><strong>6%</strong></td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Payout speed</td>
                <td className="text-center p-4 text-sm text-xs">Weekly</td>
                <td className="text-center p-4 text-sm text-xs">Standard</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50 dark:bg-blue-900/30">Standard</td>
                <td className="text-center p-4 text-sm text-xs">Fast</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Analytics</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm">Basic</td>
                <td className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">Advanced</td>
                <td className="text-center p-4 text-sm">Advanced</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <td className="p-4 text-sm">Priority visibility</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm">—</td>
                <td className="text-center p-4 text-sm bg-blue-50 dark:bg-blue-900/30">✓</td>
                <td className="text-center p-4 text-sm">✓✓</td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-green-50 dark:bg-green-900/30">
                <td className="p-4 text-sm"><strong>Protection Plan</strong></td>
                <td className="text-center p-4 text-sm text-xs">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs">$3/artwork</td>
                <td className="text-center p-4 text-sm text-xs bg-blue-50 dark:bg-blue-900/30">$3/artwork</td>
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
        <h2 className="text-2xl mb-6 text-center text-neutral-900 dark:text-neutral-50">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-base mb-2 text-neutral-900 dark:text-neutral-50">Can I change plans later?</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Yes! You can upgrade or downgrade anytime. Changes take effect at the start of your next billing cycle.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-base mb-2 text-neutral-900 dark:text-neutral-50">How does the Protection Plan work if I have multiple artworks displayed?</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              On Free, Starter, and Growth plans, protection costs $3 per displayed artwork per month. On Pro, protection is included FREE for all displayed artworks. You can toggle protection on/off for each placement.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-base mb-2 text-neutral-900 dark:text-neutral-50">What's the revenue split on sales?</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Artists receive 80% of the sale price, venues receive 10%, and Artwalls receives 10%. Your subscription plan determines the platform fee on top of this split.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}