import { useState } from 'react';
import { CheckCircle, Users, TrendingUp, Shield, Download, AlertCircle, Lightbulb, ArrowRight, Calculator, Zap } from 'lucide-react';
import { ECONOMICS } from '../../types/venueSetup';
import { calculatePricingBreakdown, formatCentsAsDollars, estimateMonthlyEarnings } from '../../lib/pricingCalculations';
import { PageHeroHeader } from '../PageHeroHeader';

interface VenuePartnerKitProps {
  onNavigate?: (page: string) => void;
}

export function VenuePartnerKit({ onNavigate }: VenuePartnerKitProps) {
  const [estimatorPrice, setEstimatorPrice] = useState(140);
  const [estimatorSalesPerMonth, setEstimatorSalesPerMonth] = useState(1);

  const handleDownloadPDF = () => {
    // In a real app, this would generate and download a PDF
    alert('Downloading Partner Kit PDF...');
  };

  const handleContactFormScroll = () => {
    const contactForm = document.getElementById('contact-form-section');
    if (contactForm) {
      contactForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculate current breakdown for the revenue example
  const currentBreakdown = calculatePricingBreakdown(200, 'free');

  // Calculate estimated earnings
  const monthlyEarnings = estimateMonthlyEarnings(estimatorPrice, estimatorSalesPerMonth);

  const steps = [
    {
      number: 1,
      title: 'Apply for Partnership',
      description: 'Submit your venue information and wall specifications.',
      time: '~2 min',
      icon: Users,
    },
    {
      number: 2,
      title: 'Get Approved',
      description: 'Our team reviews your application and connects you with artists.',
      time: '~1 day',
      icon: CheckCircle,
    },
    {
      number: 3,
      title: 'Configure Your Space',
      description: 'Set up walls, categories, and upload photos.',
      time: '~5 min',
      icon: TrendingUp,
    },
    {
      number: 4,
      title: 'Download QR Assets',
      description: 'Get ready-to-print posters and cards.',
      time: '~1 min',
      icon: Download,
    },
    {
      number: 5,
      title: 'Place QR Codes',
      description: 'Install signage in key locations throughout your venue.',
      time: '~15 min',
      icon: Lightbulb,
    },
    {
      number: 6,
      title: 'Brief Your Staff',
      description: 'Share talking points and setup instructions.',
      time: '~10 min',
      icon: Users,
    },
    {
      number: 7,
      title: 'Launch Your Profile',
      description: 'Go live and start receiving artist applications.',
      time: '~2 min',
      icon: TrendingUp,
    },
    {
      number: 8,
      title: 'Share & Promote',
      description: 'Share your venue page on social media.',
      time: '~5 min',
      icon: Zap,
    },
  ];

  const artistTiers = [
    {
      name: 'Free',
      commission: `${(ECONOMICS.ARTIST_TIERS.free * 100).toFixed(0)}%`,
      description: 'Starting artists',
      features: ['Perfect entry point', 'Full platform access'],
    },
    {
      name: 'Starter',
      commission: `${(ECONOMICS.ARTIST_TIERS.starter * 100).toFixed(0)}%`,
      description: 'Growing artists',
      features: ['Higher earnings', 'More exposure'],
    },
    {
      name: 'Growth',
      commission: `${(ECONOMICS.ARTIST_TIERS.growth * 100).toFixed(0)}%`,
      description: 'Established artists',
      features: ['Premium benefits', 'Priority placement'],
    },
    {
      name: 'Pro',
      commission: `${(ECONOMICS.ARTIST_TIERS.pro * 100).toFixed(0)}%`,
      description: 'Professional artists',
      features: ['Maximum earnings', 'Dedicated support'],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        <PageHeroHeader
          title="Become a Venue Partner"
          subtitle="Display rotating artworks and earn 15% from every sale"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Earnings Estimator Section */}
        <div className="mb-20 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 rounded-lg p-8 border border-[var(--accent)]/30">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-8 h-8 text-[var(--accent)]" />
            <h2 className="text-3xl font-bold text-[var(--text)]">Earnings Estimator</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                Average Artwork Price
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">$</span>
                <input
                  type="number"
                  value={estimatorPrice}
                  onChange={(e) => setEstimatorPrice(Number(e.target.value))}
                  className="flex-1 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                  min="10"
                  step="10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                Expected Sales per Month
              </label>
              <input
                type="number"
                value={estimatorSalesPerMonth}
                onChange={(e) => setEstimatorSalesPerMonth(Number(e.target.value))}
                className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                min="1"
                step="1"
              />
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)] mb-6">
            <p className="text-[var(--text-muted)] text-sm mb-4">At your estimated sales volume:</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-[var(--accent)]">{formatCentsAsDollars(Math.round(monthlyEarnings * 100))}</span>
              <span className="text-[var(--text-muted)]">per month</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              You earn 15% of the list price on each sale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate?.('venue-setup')}
              className="px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Begin Setup Wizard
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleContactFormScroll}
              className="px-6 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-lg font-semibold hover:bg-[var(--surface)]/80 transition-colors"
            >
              Have questions? Contact us
            </button>
          </div>
        </div>

        {/* Revenue Example */}
        <div className="mb-20 bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Revenue Example (Live Calculation)</h2>
          <p className="text-[var(--text-muted)] mb-6">Here's how earnings work when a $200 artwork sells:</p>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[var(--text)]">List Price</span>
              <span className="font-semibold text-[var(--text)]">{formatCentsAsDollars(currentBreakdown.listPriceCents)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[var(--text)]">Buyer Support Fee (4.5%)</span>
              <span className="font-semibold text-green-600">+{formatCentsAsDollars(currentBreakdown.buyerFeeCents)} (paid by customer)</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[var(--text)] font-semibold">Customer Pays</span>
              <span className="font-bold text-lg text-[var(--text)]">{formatCentsAsDollars(currentBreakdown.customerPaysCents)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[var(--text)]">Venue Earns (15%)</span>
              <span className="font-semibold text-green-600">+{formatCentsAsDollars(currentBreakdown.venueCents)}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[var(--text)]">Artist Takes Home (Free: 60%)</span>
              <span className="font-semibold text-blue-600">{formatCentsAsDollars(currentBreakdown.artistCents)}</span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-[var(--text-muted)] text-sm">Platform + Processing (Remainder)</span>
              <span className="font-semibold text-[var(--text-muted)]">{formatCentsAsDollars(currentBreakdown.platformRemainderCents)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
            <p className="text-sm text-[var(--text)]">
              <strong>Your venue earns {formatCentsAsDollars(currentBreakdown.venueCents)}</strong> on this sale while supporting artists and adding unique character to your space. Artists earn {formatCentsAsDollars(currentBreakdown.artistCents)} (60% tier), with more earnings on higher plans.
            </p>
          </div>
        </div>

        {/* Artwalls vs DIY Comparison */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-8">Artwalls vs Doing It Yourself</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text)] mb-6 text-red-600">DIY: The Burden</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Finding & vetting artists takes endless emails</span>
                </li>
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Processing payments and tracking sales manually</span>
                </li>
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Paying artists late or handling disputes</span>
                </li>
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Staff confusion about policies & talking points</span>
                </li>
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Coordinating rotation schedules & logistics</span>
                </li>
                <li className="flex gap-3 text-[var(--text-muted)]">
                  <span className="flex-shrink-0">❌</span>
                  <span>Insurance, liability, and legal complexity</span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--accent)]/5 rounded-lg p-8 border border-[var(--accent)]/30">
              <h3 className="text-lg font-bold text-[var(--text)] mb-6 text-green-600">Artwalls: The Solution</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>QR checkout—instant, no manual processing</span>
                </li>
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>Automatic payouts to artists monthly</span>
                </li>
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>Full transparency & reporting dashboard</span>
                </li>
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>Staff materials & training support included</span>
                </li>
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>We handle artist vetting & coordination</span>
                </li>
                <li className="flex gap-3 text-[var(--text)]">
                  <span className="flex-shrink-0">✅</span>
                  <span>Insurance & legal covered by us</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Artist Tiers */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Artist Earning Tiers</h2>
          <p className="text-[var(--text-muted)] mb-8">The artists you host are on different plans. Here's what they earn from every sale:</p>

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

          <div className="mt-6 p-4 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
            <p className="text-sm text-[var(--text)]">
              <strong>You always earn 15% per sale,</strong> no matter which plan the artist uses. More sales = more earnings for everyone.
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Setup Progress: 0/8 Complete</h2>
          <p className="text-[var(--text-muted)] mb-8">Follow these 8 quick steps to launch your venue profile:</p>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{step.title}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{step.description}</p>
                      </div>
                      <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded whitespace-nowrap">
                        {step.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-600">
              💡 <strong>Tip:</strong> Most venues complete all 8 steps in under 30 minutes. The investment pays off quickly.
            </p>
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

        {/* CTA & Download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
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

        {/* Contact Form Section */}
        <ContactFormSection />

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
                <li>• Buyer Support Fee: {(ECONOMICS.BUYER_FEE * 100).toFixed(1)}%</li>
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

/**
 * Contact form component for partner inquiries
 */
function ContactFormSection() {
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    company: '', // honeypot field
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Honeypot check
    if (formData.company) {
      setSubmitted(true);
      return;
    }

    // Basic validation
    if (!formData.email || !formData.message) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.message.length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          message: formData.message,
          role_context: 'venue',
          page_source: 'partner_kit',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
      setFormData({ email: '', message: '', company: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    }
  };

  return (
    <div id="contact-form-section" className="mb-20 bg-[var(--surface)] rounded-lg p-8 border border-[var(--border)]">
      <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Have questions?</h2>
      <p className="text-[var(--text-muted)] mb-6">Send us a message and we'll get back to you within 24 hours.</p>

      {submitted ? (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-700 font-semibold">Thanks! Your message has been sent.</p>
          <p className="text-sm text-green-600 mt-1">We'll respond within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] resize-none"
              rows={4}
              placeholder="Tell us what you'd like to know..."
            />
          </div>

          {/* Honeypot */}
          <input
            type="hidden"
            name="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />

          <button
            type="submit"
            className="px-6 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}