import { CheckCircle, Users, TrendingUp, Shield } from 'lucide-react';

interface VenuePartnerKitProps {
  onNavigate?: (page: string) => void;
}

export function VenuePartnerKit({ onNavigate }: VenuePartnerKitProps) {
  const steps = [
    {
      number: 1,
      title: 'Apply for Partnership',
      description: 'Submit your venue information and wall specifications. Takes 5 minutes.',
      icon: Users,
    },
    {
      number: 2,
      title: 'Get Approved',
      description: 'Our team reviews your application and connects you with artists.',
      icon: CheckCircle,
    },
    {
      number: 3,
      title: 'Display & Earn',
      description: 'Rotate artworks in your space. Earn 15% from every sale.',
      icon: TrendingUp,
    },
    {
      number: 4,
      title: 'Grow Together',
      description: 'Support artists and attract customers with unique, rotating art.',
      icon: Shield,
    },
  ];

  const economicsExample = [
    { label: 'Artwork Price', value: '$200' },
    { label: 'Platform Fee (4.5%)', value: '-$9' },
    { label: 'Venue Commission (15%)', value: '+$30' },
    { label: 'Artist Earnings (60%)', value: '$120' },
  ];

  const artistTiers = [
    {
      name: 'Free',
      commission: '60%',
      description: 'Starting artists',
      features: ['Up to 10 artworks', 'Basic profile'],
    },
    {
      name: 'Starter',
      commission: '80%',
      description: 'Growing artists',
      features: ['Up to 50 artworks', 'Advanced profile', 'Analytics'],
    },
    {
      name: 'Growth',
      commission: '83%',
      description: 'Established artists',
      features: ['Unlimited artworks', 'Featured placement', 'Priority support'],
    },
    {
      name: 'Pro',
      commission: '85%',
      description: 'Professional artists',
      features: ['Everything in Growth', 'Direct messaging', 'Custom pricing'],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-[var(--accent-contrast)]">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Become a Venue Partner</h1>
          <p className="text-xl opacity-90">Display rotating artworks and earn 15% from every sale</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* 4-Step Process */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-[var(--text)] mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--accent-contrast)] font-bold text-xl">
                    {step.number}
                  </div>
                  <Icon className="w-8 h-8 mx-auto mb-3 text-[var(--accent)]" />
                  <h3 className="font-semibold text-[var(--text)] mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Economics Example */}
        <div className="mb-20 bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Revenue Example</h2>
          <p className="text-[var(--text-muted)] mb-6">Here's how earnings work when a $200 artwork sells:</p>
          
          <div className="space-y-3">
            {economicsExample.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-[var(--border)] last:border-b-0">
                <span className="text-[var(--text)]">{item.label}</span>
                <span className={`font-semibold ${item.value.startsWith('+') ? 'text-green-600' : item.value.startsWith('-') ? 'text-red-600' : 'text-[var(--text)]'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
            <p className="text-sm text-[var(--text)]">
              <strong>Your venue earns $30</strong> on this sale while supporting artists and adding unique character to your space.
            </p>
          </div>
        </div>

        {/* Artist Tiers */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Artist Earning Tiers</h2>
          <p className="text-[var(--text-muted)] mb-8">The artists you host are on different plans. Here's what they earn:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {artistTiers.map((tier, index) => (
              <div key={index} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
                <h3 className="font-bold text-[var(--text)] mb-2">{tier.name}</h3>
                <p className="text-2xl font-bold text-[var(--accent)] mb-2">{tier.commission}</p>
                <p className="text-sm text-[var(--text-muted)] mb-4">{tier.description}</p>
                <ul className="space-y-2 text-sm text-[var(--text)]">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] cursor-pointer group">
              <summary className="font-semibold text-[var(--text)] flex justify-between items-center">
                What are the wall specifications?
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[var(--text-muted)] mt-4">We work with walls of various sizes, from 4x6 feet to 20x30 feet. Provide your dimensions during application.</p>
            </details>

            <details className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] cursor-pointer group">
              <summary className="font-semibold text-[var(--text)] flex justify-between items-center">
                How long are artworks displayed?
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[var(--text-muted)] mt-4">Typically 4-12 weeks per rotation. You have control over scheduling and can request specific artists.</p>
            </details>

            <details className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] cursor-pointer group">
              <summary className="font-semibold text-[var(--text)] flex justify-between items-center">
                Is there any risk of damage?
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[var(--text-muted)] mt-4">All artworks are insured during transit and display. Artists maintain their work's integrity.</p>
            </details>

            <details className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] cursor-pointer group">
              <summary className="font-semibold text-[var(--text)] flex justify-between items-center">
                When do I get paid?
                <span className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-[var(--text-muted)] mt-4">Payouts are processed monthly to your account. No minimum threshold.</p>
            </details>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 rounded-lg p-8 text-[var(--accent-contrast)] text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to partner with us?</h3>
          <p className="mb-6 opacity-90">Join hundreds of venues displaying rotating art and growing with Artwalls.</p>
          <button
            onClick={() => onNavigate?.('venues-apply')}
            className="px-8 py-3 bg-[var(--accent-contrast)] text-[var(--accent)] rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Start Your Application
          </button>
        </div>
      </div>
    </div>
  );
}