import { useState } from 'react';
import { Download, CheckCircle, AlertCircle, BookOpen, MapPin, Users, TrendingUp, FileText, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface VenuePartnerKitEmbeddedProps {
  onNavigate?: (page: string) => void;
}

export function VenuePartnerKitEmbedded({ onNavigate }: VenuePartnerKitEmbeddedProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    checklist: true,
    qr: true,
    economics: true,
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
    // In production, this would generate and download a PDF
    console.log('Downloading Partner Kit PDF...');
    alert('PDF download would be generated here with all content below');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">Artwalls Partner Kit</h1>
          <p className="text-lg text-[var(--text-muted)] mb-6">
            Everything you need to successfully host rotating art and maximize artist discovery
          </p>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Download className="w-5 h-5" />
            Download as PDF
          </button>
        </div>

        {/* Table of Contents */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-12">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="#setup-checklist" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <CheckCircle className="w-5 h-5" />
              Setup Checklist
            </a>
            <a href="#qr-placement" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <MapPin className="w-5 h-5" />
              QR Placement Guide
            </a>
            <a href="#economics" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <TrendingUp className="w-5 h-5" />
              How Earnings Work
            </a>
            <a href="#hosting-policy" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <FileText className="w-5 h-5" />
              Hosting Policy
            </a>
            <a href="#staff-talking" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
              <Users className="w-5 h-5" />
              Staff Talking Points
            </a>
          </div>
        </div>

        {/* Setup Checklist Section */}
        <PartnerKitSection
          id="setup-checklist"
          title="Setup Checklist"
          icon={<CheckCircle className="w-6 h-6" />}
          expanded={expandedSections.checklist}
          onToggle={() => toggleSection('checklist')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Follow this checklist to ensure your venue is fully set up and artists can find you:
            </p>

            <div className="space-y-3">
              {[
                { step: 1, title: 'Complete Your Profile', desc: 'Fill in venue name, address, hours, and links' },
                { step: 2, title: 'Upload 5+ Photos', desc: 'Show entrance, wall space, and overall ambiance' },
                { step: 3, title: 'Configure Your Walls', desc: 'Set display spots, dimensions, rotation preferences' },
                { step: 4, title: 'Categorize Your Space', desc: 'Select 2-4 categories that describe your venue' },
                { step: 5, title: 'Download QR Assets', desc: 'Get poster (8.5x11") and table tent (4x6") versions' },
                { step: 6, title: 'Place QR Codes', desc: 'Post in entrance, counter, restroom, and near art' },
                { step: 7, title: 'Brief Your Staff', desc: 'Share one-liners and collection methods with team' },
                { step: 8, title: 'Go Live', desc: 'Publish your profile to start receiving artist applications' },
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
                    Venues with all 8 steps completed receive 40% more artist applications and get featured in discovery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* QR Placement Guide */}
        <PartnerKitSection
          id="qr-placement"
          title="QR Placement Strategy"
          icon={<MapPin className="w-6 h-6" />}
          expanded={expandedSections.qr}
          onToggle={() => toggleSection('qr')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Strategic QR placement increases discovery by up to 40%. Follow these recommendations:
            </p>

            <div className="space-y-4">
              {[
                {
                  location: '📍 Entrance/Main Door',
                  why: 'First impression point',
                  placement: 'Eye level, 3-5 feet from entrance',
                  format: 'Large poster version (8.5x11")',
                  impact: 'Highest traffic - 60% of scans',
                },
                {
                  location: '💼 Counter/Register',
                  why: 'Natural pause point during transaction',
                  placement: 'Standing easel or laminated card',
                  format: 'Table tent version (4x6")',
                  impact: 'Secondary engagement - 25% of scans',
                },
                {
                  location: '🚻 Restroom',
                  why: 'Captive audience with time to browse',
                  placement: 'At eye level, framed or laminated',
                  format: 'Table tent or small poster',
                  impact: 'Tertiary discovery - 10% of scans',
                },
                {
                  location: '🖼️ Near Displayed Art',
                  why: 'Direct connection to current artwork',
                  placement: 'Below or beside the artwork',
                  format: 'Table tent or sticker version',
                  impact: 'Drives immediate purchases - variable',
                },
                {
                  location: '🚪 Exit',
                  why: 'Last chance to engage',
                  placement: 'Eye level near door',
                  format: 'Small poster or sticker',
                  impact: 'Follow-up engagement - 5% of scans',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] space-y-2">
                  <p className="font-bold text-[var(--text)]">{item.location}</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-semibold text-[var(--text)]">Why:</span> <span className="text-[var(--text-muted)]">{item.why}</span></p>
                    <p><span className="font-semibold text-[var(--text)]">Placement:</span> <span className="text-[var(--text-muted)]">{item.placement}</span></p>
                    <p><span className="font-semibold text-[var(--text)]">Format:</span> <span className="text-[var(--text-muted)]">{item.format}</span></p>
                    <p><span className="font-semibold text-[var(--text)]">Impact:</span> <span className="text-[var(--text-muted)]">{item.impact}</span></p>
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
                    Test placement locations with team. Move codes that get low engagement to higher-traffic spots.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* Economics Section */}
        <PartnerKitSection
          id="economics"
          title="How Earnings Work"
          icon={<TrendingUp className="w-6 h-6" />}
          expanded={expandedSections.economics}
          onToggle={() => toggleSection('economics')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Transparent economics. Venues earn 15% per sale. Artists choose their plan (60-85% earnings).
            </p>

            {/* Economics Breakdown */}
            <div className="space-y-4">
              <p className="font-semibold text-[var(--text)]">Example: $200 Artwork Sale</p>

              {[
                { item: 'Artwork Price', amount: '$200', color: 'text-green-600' },
                { item: 'Platform Fee (4.5%)', amount: '-$9', color: 'text-red-600' },
                { item: 'Your Commission (15%)', amount: '+$30', color: 'text-green-600', bold: true },
                { item: 'Artist Take-Home (60-85%)', amount: '$120-$162', color: 'text-blue-600' },
              ].map((line, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <span className={`font-${line.bold ? 'bold' : 'medium'} text-[var(--text)]`}>
                    {line.item}
                  </span>
                  <span className={`font-${line.bold ? 'bold' : 'medium'} ${line.color}`}>
                    {line.amount}
                  </span>
                </div>
              ))}
            </div>

            {/* Artist Tiers */}
            <div>
              <p className="font-semibold text-[var(--text)] mb-4">Artist Commission Tiers</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Free',
                    earnings: '60%',
                    description: 'Perfect for emerging artists starting out',
                  },
                  {
                    name: 'Starter ($5/mo)',
                    earnings: '72%',
                    description: 'More exposure, dedicated support',
                  },
                  {
                    name: 'Pro ($15/mo)',
                    earnings: '85%',
                    description: 'Premium features, priority placement',
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
              <p className="font-semibold text-[var(--text)]">Key Economics Points</p>
              {[
                '✓ You earn 15% on every sale, regardless of artist tier',
                '✓ Platform takes 4.5% to cover payments, hosting, and support',
                '✓ No upfront fees or hidden charges',
                '✓ Payouts processed monthly to your bank account',
                '✓ Artists choose their commission tier - you benefit either way',
                '✓ More art rotations = more chances for sales = higher earnings',
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
          title="Hosting Policy & Best Practices"
          icon={<FileText className="w-6 h-6" />}
          expanded={expandedSections.hosting}
          onToggle={() => toggleSection('hosting')}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  title: 'Art Rotation',
                  content: 'Rotate artworks every 30-60 days for best results. More rotations = more discovery = more earnings.',
                },
                {
                  title: 'Display Standards',
                  content: 'Ensure artworks are clean, properly framed/mounted, and protected from direct sunlight or moisture.',
                },
                {
                  title: 'Artist Communication',
                  content: 'Keep artists updated on sales, foot traffic, and display performance through our platform.',
                },
                {
                  title: 'QR Code Maintenance',
                  content: 'Check QR codes monthly for damage. Laminate them or protect with clear acrylic covers.',
                },
                {
                  title: 'Customer Service',
                  content: 'Respond to collector inquiries promptly. Customer satisfaction = more referrals and repeats.',
                },
                {
                  title: 'Photography & Social',
                  content: 'Share photos of displayed art on your social media. Tag artists. This drives traffic for both parties.',
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
          title="Staff Talking Points"
          icon={<Users className="w-6 h-6" />}
          expanded={expandedSections.staffTalking}
          onToggle={() => toggleSection('staffTalking')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Train your staff to share these points when customers ask about the art:
            </p>

            <div className="space-y-3">
              {[
                {
                  scenario: 'Customer asks: "Who is the artist?"',
                  response: "Scan the QR code! You'll see the artist's profile, their story, and can buy directly if you love it.",
                },
                {
                  scenario: 'Customer asks: "How often does this change?"',
                  response: 'We rotate artworks every month or two, depending on sales and artist availability. Always something new to discover.',
                },
                {
                  scenario: 'Customer asks: "Can I buy it?"',
                  response: 'Yes! Scan the QR below the artwork to view prices and purchase. We ship anywhere.',
                },
                {
                  scenario: 'Customer asks: "Is this supporting local artists?"',
                  response: 'Absolutely. These are independent artists from [your region/network]. Your purchase goes 85% to support them.',
                },
                {
                  scenario: 'Customer asks: "Why do you have art on the walls?"',
                  response: 'It creates a unique atmosphere, supports our community, and gives you something beautiful to enjoy while [waiting/dining/etc].',
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
              <p className="font-medium text-purple-600 mb-2">💡 Empowerment Angle</p>
              <p className="text-sm text-purple-600/80">
                Frame this as: "We're giving artists a way to reach collectors, and giving you a way to discover emerging talent. It's a win-win."
              </p>
            </div>
          </div>
        </PartnerKitSection>

        {/* Next Steps */}
        <div className="mt-12 p-8 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-lg">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Ready to Get Started?</h2>
          <p className="text-[var(--text-muted)] mb-6">
            You've reviewed the Partner Kit. Now it's time to set up your profile and start receiving artist applications.
          </p>
          <button
            onClick={() => onNavigate?.('venue-dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
