import { useState } from 'react';
import { Download, CheckCircle, AlertCircle, BookOpen, MapPin, Users, TrendingUp, FileText, ArrowRight, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { ECONOMICS } from '../../types/venueSetup';
import { calculatePricingBreakdown, formatCentsAsDollars } from '../../lib/pricingCalculations';

// Collapsible Section Component
function PartnerKitSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-8 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-[var(--surface-2)] transition"
      >
        <div className="flex items-center gap-4">
          <div className="text-[var(--accent)]">{icon}</div>
          <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-6 h-6 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-6 h-6 text-[var(--text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)]">
          {children}
        </div>
      )}
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

interface VenuePartnerKitEmbeddedProps {
  onNavigate?: (page: string) => void;
}

/**
 * "Get my venue live" intake form — stores in DB + notifies admin.
 */
function GetMyVenueLiveForm() {
  const [form, setForm] = useState({ venue_name: '', contact_name: '', contact_email: '', city: '', notes: '', company: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.company) { setSubmitted(true); return; } // honeypot
    if (!form.venue_name || !form.contact_email) { setError('Venue name and email are required.'); return; }

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.contact_email,
          message: `[Get My Venue Live] Venue: ${form.venue_name}, Contact: ${form.contact_name}, City: ${form.city}, Notes: ${form.notes}`,
          role_context: 'venue',
          page_source: 'partner_kit_intake',
        }),
      });
      if (!response.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setError('Unable to submit. Please try again.');
    }
  };

  return (
    <div className="mb-12 bg-gradient-to-r from-[var(--green)]/5 to-[var(--accent)]/5 border border-[var(--green)]/30 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Get My Venue Live</h2>
      <p className="text-[var(--text-muted)] mb-6">
        Fill out this quick form and our team will help you get set up within 48 hours.
      </p>

      {submitted ? (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-700 font-semibold">We've got your info!</p>
          <p className="text-sm text-green-600 mt-1">We'll reach out within 48 hours to help you go live.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Venue Name *</label>
              <input type="text" value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]" placeholder="The Corner Gallery" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Contact Name</label>
              <input type="text" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">Email *</label>
              <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]" placeholder="you@venue.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1">City</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)]" placeholder="Los Angeles" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">Anything else?</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] resize-none" rows={2} placeholder="Number of walls, preferred art styles, opening date…" />
          </div>
          <input type="hidden" name="company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          <button type="submit" className="px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition-opacity">
            Get Started
          </button>
        </form>
      )}
    </div>
  );
}

export function VenuePartnerKitEmbedded({ onNavigate }: VenuePartnerKitEmbeddedProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    economics: true,
    checklist: true,
    qr: false,
    hosting: false,
    staffTalking: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDownloadPDF = () => {
    // Expand all sections for the PDF
    setExpandedSections({
      economics: true,
      checklist: true,
      qr: true,
      hosting: true,
      staffTalking: true,
    });

    // Allow render cycle to complete then print
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleContactFormScroll = () => {
    const contactForm = document.getElementById('contact-form-section');
    if (contactForm) {
      contactForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Calculate current breakdown for the revenue example
  const currentBreakdown = calculatePricingBreakdown(200, 'free');

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { 
            background: white !important; 
            color: black !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          
          /* Hide App Shell UI */
          nav, .dashboard-header, .dashboard-tabs, .alert, .quick-actions, .mobile-sidebar { 
            display: none !important; 
          }

          /* Hide Interactive Elements inside Component */
          button, #contact-form-section { 
            display: none !important; 
          }

          /* Content Styling */
          h1, h2, h3, p, span, div { 
            color: #000 !important; 
          }
          
          /* Ensure backgrounds print lightly */
          [class*="bg-"] {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Reset Layout */
          .min-h-screen { 
            min-height: 0 !important; 
            padding: 0 !important; 
            background: white !important;
          }
          .max-w-3xl { 
            max-width: none !important; 
            margin: 0 !important;
          }
          
          /* Hide URL footprints if browser settings allow, otherwise css can't force it */
        }
      `}</style>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">Venue Success Guide</h1>
          <p className="text-lg text-[var(--text-muted)] mb-6">
            Turn your walls into a destination. Support local culture, drive foot traffic, and support the arts.
          </p>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Download className="w-5 h-5" />
            Print / Save as PDF
          </button>
        </div>

        {/* Table of Contents */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-12">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="#economics" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <TrendingUp className="w-5 h-5" />
              The Partnership Model
            </a>
            <a href="#setup-checklist" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <CheckCircle className="w-5 h-5" />
              Launch Checklist
            </a>
            <a href="#qr-placement" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <MapPin className="w-5 h-5" />
              Engagement & Discovery
            </a>
            <a href="#hosting-policy" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <FileText className="w-5 h-5" />
              Partnership Promise
            </a>
            <a href="#staff-talking" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <Users className="w-5 h-5" />
              Local Art Ambassadors
            </a>
          </div>
        </div>

        {/* Setup Checklist Section */}
        <PartnerKitSection
          id="setup-checklist"
          title="Launch Checklist"
          icon={<CheckCircle className="w-6 h-6" />}
          expanded={expandedSections.checklist}
          onToggle={() => toggleSection('checklist')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Get ready to become a local art hub. Follow these steps to ensure artists can find you:
            </p>

            <div className="space-y-3">
              {[
                { step: 1, title: 'Tell Your Story', desc: 'Fill in venue name, address, hours, and your vibe' },
                { step: 2, title: 'Showcase Your Space', desc: 'Upload 5+ photos showing entrance, walls, and ambiance' },
                { step: 3, title: 'Define Your Gallery', desc: 'Set display spots, dimensions, and rotation style' },
                { step: 4, title: 'Set Your Vibe', desc: 'Select categories that match your venue (e.g. Modern, Cozy)' },
                { step: 5, title: 'Get Discovery Assets', desc: 'Download your custom QR posters' },
                { step: 6, title: 'Activate Discovery', desc: 'Place QR codes in high-visibility spots to start conversations' },
                { step: 7, title: 'Empower Your Team', desc: 'Give your staff the "Local Art Ambassador" one-pager' },
                { step: 8, title: 'Go Live', desc: 'Publish your profile to start connecting with local artists' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--text)]">{item.title}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-600">Pro Tip</p>
                  <p className="text-sm text-green-600/80 mt-1">
                    Venues with a complete story and 5+ photos see 40% more artist applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* QR Placement Guide */}
        <PartnerKitSection
          id="qr-placement"
          title="Engagement & Discovery"
          icon={<MapPin className="w-6 h-6" />}
          expanded={expandedSections.qr}
          onToggle={() => toggleSection('qr')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Placement isn't just about scanning; it's about starting conversations. Strategic signs increase engagement by 40%.
            </p>

            <div className="space-y-4">
              {[
                {
                  location: '📍 The Welcome Moment',
                  why: 'Sets the tone immediately: "This is a creative space."',
                  placement: 'Entrance or high-traffic wall',
                  format: 'Poster (8.5x11")',
                },
                {
                  location: '🎨 The Storyteller',
                  why: 'Connects the viewer directly to the creator\'s story.',
                  placement: 'Next to the artwork',
                  format: 'Label or Sticker',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-[var(--text)]">{item.location}</p>
                    <span className="text-xs font-mono bg-[var(--surface)] px-2 py-1 rounded border border-[var(--border)]">{item.format}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-semibold text-[var(--text)]">Why:</span> <span className="text-[var(--text-muted)]">{item.why}</span></p>
                    <p><span className="font-semibold text-[var(--text)]">Placement:</span> <span className="text-[var(--text-muted)]">{item.placement}</span></p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-600">Best Practice</p>
                  <p className="text-sm text-blue-600/80 mt-1">
                    Experiment! Move codes that get low engagement to higher-traffic spots to find what works for your unique flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* Economics Section */}
        <PartnerKitSection
          id="economics"
          title="The Partnership Model"
          icon={<TrendingUp className="w-6 h-6" />}
          expanded={expandedSections.economics}
          onToggle={() => toggleSection('economics')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Our model creates a sustainable ecosystem for local creativity. The majority of every purchase goes directly to the artist, while a portion supports your venue's role as a cultural host.
            </p>

            {/* Live Economics Breakdown */}
            <div className="space-y-4">
              <p className="font-semibold text-[var(--text)]">Example: $200 Community Support (Live Calculation)</p>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-[var(--text)]">List Price</span>
                <span className="font-semibold text-[var(--text)]">{formatCentsAsDollars(currentBreakdown.listPriceCents)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-[var(--text)]">Buyer Support Fee (4.5%)</span>
                <span className="font-semibold text-green-600">+{formatCentsAsDollars(currentBreakdown.buyerFeeCents)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="font-semibold text-[var(--text)]">Customer Pays</span>
                <span className="font-bold text-lg text-[var(--text)]">{formatCentsAsDollars(currentBreakdown.customerPaysCents)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-[var(--text)]">Venue Support Share (15%)</span>
                <span className="font-semibold text-green-600">+{formatCentsAsDollars(currentBreakdown.venueCents)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-[var(--text)]">Artist Support (Free: 60%)</span>
                <span className="font-semibold text-blue-600">{formatCentsAsDollars(currentBreakdown.artistCents)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <span className="text-[var(--text-muted)] text-sm">Platform + Processing (Remainder)</span>
                <span className="font-semibold text-[var(--text-muted)]">{formatCentsAsDollars(currentBreakdown.platformRemainderCents)}</span>
              </div>
            </div>

            {/* Artist Tiers - Updated */}
            <div>
              <p className="font-semibold text-[var(--text)] mb-4">Artist Commission Tiers</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  {
                    name: 'Free',
                    earnings: `${(ECONOMICS.ARTIST_TIERS.free * 100).toFixed(0)}%`,
                    description: 'Perfect for emerging artists starting out',
                  },
                  {
                    name: 'Starter',
                    earnings: `${(ECONOMICS.ARTIST_TIERS.starter * 100).toFixed(0)}%`,
                    description: 'More exposure, dedicated support',
                  },
                  {
                    name: 'Growth',
                    earnings: `${(ECONOMICS.ARTIST_TIERS.growth * 100).toFixed(0)}%`,
                    description: 'Established artists with higher earnings',
                  },
                  {
                    name: 'Pro',
                    earnings: `${(ECONOMICS.ARTIST_TIERS.pro * 100).toFixed(0)}%`,
                    description: 'Professional artists with max benefits',
                  },
                ].map((tier) => (
                  <div key={tier.name} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="font-bold text-[var(--text)] mb-1">{tier.name}</p>
                    <p className="text-2xl font-bold text-[var(--accent)] mb-2">{tier.earnings}</p>
                    <p className="text-xs text-[var(--text-muted)]">{tier.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Points */}
            <div className="space-y-2">
              <p className="font-semibold text-[var(--text)]">How It Supports Everyone</p>
              {[
                '✓ Your venue receives 15% as a thank you for hosting and managing the display',
                '✓ Buyer Support Fee: 4.5% (paid by the customer at checkout)',
                '✓ No upfront fees or hidden charges',
                '✓ Payouts processed monthly to your bank account',
                '✓ Artists choose their commission tier - you benefit either way',
                '✓ More art rotations = more discovery offering for your community',
              ].map((point, idx) => (
                <p key={idx} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                  <span className="flex-shrink-0">{point.split(' ')[0]}</span>
                  <span>{point.substring(2)}</span>
                </p>
              ))}
            </div>
          </div>
        </PartnerKitSection>

        {/* Hosting Policy */}
        <PartnerKitSection
          id="hosting-policy"
          title="Partnership Promise"
          icon={<FileText className="w-6 h-6" />}
          expanded={expandedSections.hosting}
          onToggle={() => toggleSection('hosting')}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  title: 'Fresh Perspectives',
                  content: 'Rotate artworks every 30-90 days to keep your walls alive. New art = new reasons for customers to return.',
                },
                {
                  title: 'Showcase Standards',
                  content: 'Treat the art with respect. Ensure it is displayed safely, lit well, and free from hazards.',
                },
                {
                  title: 'Artist Connection',
                  content: 'You share this space. Keep communication open with your artists about how their work is being received.',
                },
                {
                  title: 'Community Connection',
                  content: 'Be a host. When customers ask, share the story. Your enthusiasm makes the sale.',
                },
                {
                  title: 'Shared Success',
                  content: 'Celebrate wins! Share photos of the art, tag the artists, and let your followers know you support local creators.',
                },
              ].map((policy, idx) => (
                <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <p className="font-bold text-[var(--text)] mb-2">{policy.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">{policy.content}</p>
                </div>
              ))}
            </div>
          </div>
        </PartnerKitSection>

        {/* Staff Talking Points */}
        <PartnerKitSection
          id="staff-talking"
          title="Local Art Ambassadors"
          icon={<Users className="w-6 h-6" />}
          expanded={expandedSections.staffTalking}
          onToggle={() => toggleSection('staffTalking')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Your team is the face of this partnership. Help them feel confident sharing the story:
            </p>

            <div className="space-y-3">
              {[
                {
                  scenario: 'Customer asks: "Who is the artist?"',
                  response: "This is [Artist Name], a local creator. Scan the QR code to read their full story and see more of their work!",
                },
                {
                  scenario: 'Customer asks: "How often does this change?"',
                  response: 'We feature new local artists every month or so. It keeps our space fresh and supports more creators in our community.',
                },
                {
                  scenario: 'Customer asks: "Can I buy it?"',
                  response: 'Yes! It takes 10 seconds. Just scan the code, pay on your phone, and it supports the artist directly.',
                },
                {
                  scenario: 'Customer asks: "Is this supporting local artists?"',
                  response: '100%. We partner with local artists to give them exhibition space. 85% of the sale goes directly to supporting their career.',
                },
                {
                  scenario: 'Customer asks: "Why do you have art on the walls?"',
                  response: 'We believe our walls should do more than just hold up the roof. They should build up our community.',
                },
              ].map((talking, idx) => (
                <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <p className="font-bold text-[var(--text)] mb-2 text-sm">{talking.scenario}</p>
                  <p className="text-sm text-[var(--text-muted)] italic border-l-2 border-[var(--accent)] pl-3">
                    {talking.response}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <p className="font-medium text-purple-600 mb-2">💡 The Mission</p>
              <p className="text-sm text-purple-600/80">
                Remind your team: "We aren't just selling art; we are connecting our customers with the creative soul of our city."
              </p>
            </div>
          </div>
        </PartnerKitSection>

        {/* Next Steps */}
        <ContactFormSection />

        {/* ── Wall Spec Checklist + Install-Day Expectations ── */}
        <PartnerKitSection
          id="wall-spec"
          title="Wall Spec & Install-Day Checklist"
          icon={<CheckCircle className="w-6 h-6" />}
          expanded={expandedSections.wallSpec ?? false}
          onToggle={() => toggleSection('wallSpec')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Before an artist shows up, make sure each wall is ready. Use this checklist for every new display spot.
            </p>

            <div className="space-y-3">
              <p className="font-semibold text-[var(--text)]">Wall Readiness</p>
              {[
                'Measure wall dimensions (width × height) and note in your Artwalls profile',
                'Check weight capacity — can the wall hold the artwork safely?',
                'Verify adequate lighting (natural or spot) reaches the display area',
                'Ensure hanging hardware is in place (hooks, picture rail, or D-ring mounts)',
                'Clear the wall area of furniture, signage, or obstructions',
                'Photograph the empty wall from 6 ft away, straight-on',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-muted)]">{item}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-[var(--text)]">Install-Day Expectations</p>
              {[
                'Artist arrives with wrapped artwork; allow 15–30 min for install',
                'Venue provides access to wall and any needed step stool or ladder',
                'Both parties confirm placement, level, and lighting before artist leaves',
                'Venue places QR label next to artwork within 24 hours',
                'Take a "live" photo together — great for social media!',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <Zap className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-muted)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </PartnerKitSection>

        {/* ── Wall Photo Guidance ────────────────────────── */}
        <PartnerKitSection
          id="wall-photos"
          title="Wall Photo Examples & Guidance"
          icon={<BookOpen className="w-6 h-6" />}
          expanded={expandedSections.wallPhotos ?? false}
          onToggle={() => toggleSection('wallPhotos')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Great wall photos attract better artist applications. Here's what to aim for:
            </p>
            {[
              {
                title: '✅ Good: Clean, well-lit, straight-on shot',
                desc: 'Stand 6–8 feet back, center the wall, make sure the floor line is level. Natural daylight works best.',
              },
              {
                title: '✅ Good: Context shot with surroundings',
                desc: 'Show 2–3 feet of surrounding space so artists can imagine their work in your environment.',
              },
              {
                title: '✅ Good: Detail shot of hardware/lighting',
                desc: 'Close-up of your hanging system or spotlight rig helps artists plan their install.',
              },
              {
                title: '❌ Avoid: Dark, blurry, or angled shots',
                desc: 'Low-quality photos make your space look less inviting. Take 30 seconds to frame it right.',
              },
            ].map((example, idx) => (
              <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <p className="font-semibold text-[var(--text)] text-sm mb-1">{example.title}</p>
                <p className="text-sm text-[var(--text-muted)]">{example.desc}</p>
              </div>
            ))}
          </div>
        </PartnerKitSection>

        {/* ── "Get My Venue Live" intake form ────────────── */}
        <GetMyVenueLiveForm />

        <div className="mt-12 p-8 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-lg">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Start Your Art Journey</h2>
          <p className="text-[var(--text-muted)] mb-6">
            You have the guide. Now bring the art to your walls and the community to your door.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate?.('venue-dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate?.('venue-calls')}
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--accent)] text-[var(--accent)] rounded-lg font-semibold hover:bg-[var(--accent)]/5 transition"
            >
              Post Your First Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
