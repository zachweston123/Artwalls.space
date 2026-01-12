import { CheckCircle, Users, TrendingUp, Shield, Download, AlertCircle, Lightbulb } from 'lucide-react';
import { ECONOMICS } from '../../types/venueSetup';

interface VenuePartnerKitProps {
  onNavigate?: (page: string) => void;
}

export function VenuePartnerKit({ onNavigate }: VenuePartnerKitProps) {
  const handleDownloadPDF = () => {
    // In a real app, this would generate and download a PDF
    alert('Downloading Partner Kit PDF...');
  };
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
    { label: `Platform Fee (${(ECONOMICS.BUYER_FEE * 100).toFixed(1)}%)`, value: `-$${(200 * ECONOMICS.BUYER_FEE).toFixed(0)}` },
    { label: `Venue Commission (${(ECONOMICS.VENUE_COMMISSION * 100).toFixed(0)}%)`, value: `+$${(200 * ECONOMICS.VENUE_COMMISSION).toFixed(0)}` },
    { label: `Artist Earnings - Free Tier (${(ECONOMICS.ARTIST_TIERS.free * 100).toFixed(0)}%)`, value: `$${(200 * ECONOMICS.ARTIST_TIERS.free).toFixed(0)}` },
  ];

  const artistTiers = [
    {
      name: 'Free',
      commission: `${(ECONOMICS.ARTIST_TIERS.free * 100).toFixed(0)}%`,
      description: 'Starting artists',
      features: ['Up to 10 artworks', 'Basic profile'],
    },
    {
      name: 'Starter',
      commission: `${(ECONOMICS.ARTIST_TIERS.starter * 100).toFixed(0)}%`,
      description: 'Growing artists',
      features: ['Up to 50 artworks', 'Advanced profile', 'Analytics'],
    },
    {
      name: 'Pro',
      commission: `${(ECONOMICS.ARTIST_TIERS.pro * 100).toFixed(0)}%`,
      description: 'Professional artists',
      features: ['Unlimited artworks', 'Featured placement', 'Direct messaging', 'Priority support'],
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

        {/* QR Placement Best Practices */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6 flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-[var(--accent)]" />
            QR Code Placement Best Practices
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-3">Wall Poster (Large Format)</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Mount near the artwork for detailed viewing and artist discovery.</p>
              <ul className="text-sm space-y-2 text-[var(--text-muted)]">
                <li>✓ Place at eye level (48-60" from ground)</li>
                <li>✓ Use 8.5x11" or larger</li>
                <li>✓ Ensure good lighting</li>
              </ul>
            </div>

            <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-3">Table Tent QR Code</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Place on tables for customers to scan during dining or browsing.</p>
              <ul className="text-sm space-y-2 text-[var(--text-muted)]">
                <li>✓ Use 4x6" or 5x7" tent cards</li>
                <li>✓ Place at table center or corner</li>
                <li>✓ Rotate regularly for visibility</li>
              </ul>
            </div>

            <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-3">Staff Handout Cards</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Give to interested customers who ask about the artwork.</p>
              <ul className="text-sm space-y-2 text-[var(--text-muted)]">
                <li>✓ Business card size (2x3.5")</li>
                <li>✓ Include artist name and title</li>
                <li>✓ Train staff on talking points</li>
              </ul>
            </div>

            <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)] mb-3">Social Media Integration</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">Share your venue page and current artworks on social channels.</p>
              <ul className="text-sm space-y-2 text-[var(--text-muted)]">
                <li>✓ Post about new rotations</li>
                <li>✓ Tag the artists</li>
                <li>✓ Share customer experiences</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hosting Policy */}
        <div className="mb-20 bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Hosting Policy Summary</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-[var(--accent)] pl-4">
              <h3 className="font-semibold text-[var(--text)]">What You Agree To</h3>
              <ul className="mt-2 text-sm space-y-1 text-[var(--text-muted)]">
                <li>✓ Display rotating artworks selected through our platform</li>
                <li>✓ Maintain artwork safety and proper conditions</li>
                <li>✓ Handle QR code placement and promotion</li>
                <li>✓ Coordinate rotation schedules with artists</li>
              </ul>
            </div>

            <div className="border-l-4 border-[var(--accent)] pl-4">
              <h3 className="font-semibold text-[var(--text)]">What We Handle</h3>
              <ul className="mt-2 text-sm space-y-1 text-[var(--text-muted)]">
                <li>✓ Artist vetting and quality control</li>
                <li>✓ Sales transactions and payments</li>
                <li>✓ Artwork insurance during display</li>
                <li>✓ Platform and support</li>
              </ul>
            </div>

            <div className="border-l-4 border-[var(--accent)] pl-4">
              <h3 className="font-semibold text-[var(--text)]">Content Guidelines</h3>
              <ul className="mt-2 text-sm space-y-1 text-[var(--text-muted)]">
                <li>✓ All artwork vetted for quality and appropriateness</li>
                <li>✓ You can decline artwork that doesn't fit your space</li>
                <li>✓ Full transparency on artist background and work</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Staff One-Liner */}
        <div className="mb-20 bg-[var(--accent)]/10 rounded-lg p-8 border border-[var(--accent)]/30">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Staff One-Liner</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">Teach your staff this simple description to share with curious customers:</p>
          <div className="bg-[var(--surface)] p-4 rounded-lg border-2 border-[var(--accent)] mb-4">
            <p className="text-[var(--text)] font-medium">
              "Scan the QR code to discover and support emerging artists directly. Every purchase supports the artist, and we're proud to host rotating artwork in our space."
            </p>
          </div>
          <button className="text-sm text-[var(--accent)] hover:underline">
            Copy to clipboard
          </button>
        </div>

        {/* Setup Checklist */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Setup Checklist</h2>
          <div className="space-y-3">
            {[
              { title: 'Complete Venue Profile', desc: 'Name, address, hours, website, Instagram' },
              { title: 'Upload Photos', desc: 'Minimum 3 high-quality photos of your space' },
              { title: 'Configure Wall Settings', desc: 'Wall type, dimensions, and number of display spots' },
              { title: 'Select Categories', desc: 'Choose art styles and themes that match your space' },
              { title: 'Download QR Assets', desc: 'Poster, table tent, and staff card versions' },
              { title: 'Print & Place QR Codes', desc: 'Install in recommended locations throughout venue' },
              { title: 'Train Staff', desc: 'Share the one-liner and discuss the program' },
              { title: 'Share Venue Page', desc: 'Promote on social media and to customers' },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */
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

        {/* CTA & Download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 rounded-lg p-8 text-[var(--accent-contrast)] flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="mb-6 opacity-90">Join hundreds of venues displaying rotating art and earning revenue.</p>
            </div>
            <button
              onClick={() => onNavigate?.('venue-setup')}
              className="px-6 py-3 bg-[var(--accent-contrast)] text-[var(--accent)] rounded-lg font-semibold hover:opacity-90 transition-opacity w-full"
            >
              Begin Setup Wizard
            </button>
          </div>

          <div className="bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)] flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[var(--text)] mb-2 flex items-center gap-2">
                <Download className="w-6 h-6 text-[var(--accent)]" />
                Partner Kit
              </h3>
              <p className="text-[var(--text-muted)] mb-4">Download a printable version of this guide with all setup instructions and economics breakdown.</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Important Note */}
        <div className="mt-12 p-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Economics Consistency Guarantee</h3>
              <p className="text-sm text-amber-800 mb-2">
                All economics figures in this guide are consistent across Artwalls:
              </p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Platform Fee: {(ECONOMICS.BUYER_FEE * 100).toFixed(1)}%</li>
                <li>• Venue Commission: {(ECONOMICS.VENUE_COMMISSION * 100).toFixed(0)}%</li>
                <li>• Artist Take-Home: {(ECONOMICS.ARTIST_TIERS.free * 100).toFixed(0)}% (Free) to {(ECONOMICS.ARTIST_TIERS.pro * 100).toFixed(0)}% (Pro)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}