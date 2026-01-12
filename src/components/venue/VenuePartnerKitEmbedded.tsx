import { useState } from 'react';
import { Download, CheckCircle, AlertCircle, BookOpen, MapPin, Users, TrendingUp, FileText, ArrowRight, ChevronDown, ChevronUp, Lock, Zap, Clock, BarChart3, Heart } from 'lucide-react';
import { ECONOMICS } from '../../types/venueSetup';

interface VenuePartnerKitEmbeddedProps {
  onNavigate?: (page: string) => void;
}

export function VenuePartnerKitEmbedded({ onNavigate }: VenuePartnerKitEmbeddedProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    estimator: true,
    checklist: true,
    qr: false,
    economics: true,
    comparison: false,
    hosting: false,
    staffTalking: false,
    contact: false,
  });

  const [estimatorData, setEstimatorData] = useState({
    avgPrice: 140,
    salesPerMonth: 1,
    displaySpots: 1,
  });

  const [contactForm, setContactForm] = useState({
    email: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate earnings estimator
  const estimatedMonthlyEarnings = estimatorData.avgPrice * ECONOMICS.VENUE_COMMISSION * estimatorData.salesPerMonth * estimatorData.displaySpots;

  // Calculate example economics
  const examplePrice = 200;
  const buyerFee = examplePrice * ECONOMICS.BUYER_FEE;
  const venueCommission = examplePrice * ECONOMICS.VENUE_COMMISSION;
  const artistEarningsFree = examplePrice * ECONOMICS.ARTIST_TIERS.free;
  const artistEarningsStarter = examplePrice * ECONOMICS.ARTIST_TIERS.starter;
  const artistEarningsGrowth = examplePrice * ECONOMICS.ARTIST_TIERS.growth;
  const artistEarningsPro = examplePrice * ECONOMICS.ARTIST_TIERS.pro;

  const handleDownloadPDF = () => {
    console.log('Downloading Partner Kit PDF...');
    alert('PDF download would be generated here with all content below');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.email || !contactForm.message) {
      setContactStatus('error');
      return;
    }
    setContactStatus('loading');
    
    // Simulate API call to save to support_messages table
    setTimeout(() => {
      console.log('Contact form submitted:', { ...contactForm, role: 'Venue' });
      setContactStatus('success');
      setContactForm({ email: '', message: '' });
      setTimeout(() => setContactStatus('idle'), 5000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">Artwalls Partner Kit</h1>
          <p className="text-lg text-[var(--text-muted)] mb-6">
            Everything you need to successfully host rotating art and maximize earnings
          </p>

          {/* Download & CTA Button */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 transition"
            >
              <Download className="w-5 h-5" />
              Download as PDF
            </button>
            <button
              onClick={() => setExpandedSections(prev => ({ ...prev, contact: !prev.contact }))}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-[var(--text)] border border-[var(--border)] rounded-lg font-semibold hover:bg-white/20 transition"
            >
              Need Help? Contact Us
            </button>
          </div>
        </div>

        {/* Trust Indicators - High Up */}
        <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Lock, label: 'No Cost to Start', description: 'Zero upfront fees' },
            { icon: Zap, label: 'No Inventory', description: 'Artists handle fulfillment' },
            { icon: Users, label: 'No Staff Checkout', description: 'QR-based sales' },
            { icon: Heart, label: 'You Decide', description: 'Decline any art anytime' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                <Icon className="w-6 h-6 text-[var(--accent)] mb-2" />
                <p className="font-semibold text-[var(--text)] text-sm">{item.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* Earnings Estimator - Above the Fold */}
        <PartnerKitSection
          id="earnings-estimator"
          title="Earnings Estimator"
          icon={<BarChart3 className="w-6 h-6" />}
          expanded={expandedSections.estimator}
          onToggle={() => toggleSection('estimator')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              See how much you could earn. Adjust the numbers to match your space:
            </p>

            {/* Estimator Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                  Average Artwork Price
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={estimatorData.avgPrice}
                    onChange={(e) => setEstimatorData(prev => ({ ...prev, avgPrice: Math.max(10, Number(e.target.value)) }))}
                    className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                  />
                  <span className="text-sm text-[var(--text-muted)]">$</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                  Est. Sales/Month
                </label>
                <input
                  type="number"
                  value={estimatorData.salesPerMonth}
                  onChange={(e) => setEstimatorData(prev => ({ ...prev, salesPerMonth: Math.max(1, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                  Display Spots
                </label>
                <input
                  type="number"
                  value={estimatorData.displaySpots}
                  onChange={(e) => setEstimatorData(prev => ({ ...prev, displaySpots: Math.max(1, Number(e.target.value)) }))}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                />
              </div>
            </div>

            {/* Results */}
            <div className="p-6 bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/30">
              <p className="text-sm text-[var(--text-muted)] mb-1">Estimated Monthly Earnings</p>
              <p className="text-3xl font-bold text-[var(--accent)] mb-2">
                ${estimatedMonthlyEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                At ${estimatorData.avgPrice} × {estimatorData.salesPerMonth} sale(s) × {estimatorData.displaySpots} spot(s) × 15% commission
              </p>
            </div>

            {/* Example Line Items */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--text)]">Example: One ${estimatorData.avgPrice} Sale</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-[var(--surface-2)] rounded">
                  <p className="text-[var(--text-muted)]">You earn</p>
                  <p className="font-bold text-[var(--accent)]">${(estimatorData.avgPrice * ECONOMICS.VENUE_COMMISSION).toFixed(2)}</p>
                </div>
                <div className="p-2 bg-[var(--surface-2)] rounded">
                  <p className="text-[var(--text-muted)]">Artist earns (avg)</p>
                  <p className="font-bold text-blue-600">${(estimatorData.avgPrice * 0.82).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* Quick Navigation */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-12">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="#setup-checklist" className="flex items-center gap-2 text-[var(--accent)] hover:underline text-sm">
              <CheckCircle className="w-5 h-5" />
              Setup Checklist
            </a>
            <a href="#qr-placement" className="flex items-center gap-2 text-[var(--accent)] hover:underline text-sm">
              <MapPin className="w-5 h-5" />
              QR Placement Guide
            </a>
            <a href="#economics" className="flex items-center gap-2 text-[var(--accent)] hover:underline text-sm">
              <TrendingUp className="w-5 h-5" />
              How Earnings Work
            </a>
            <a href="#comparison" className="flex items-center gap-2 text-[var(--accent)] hover:underline text-sm">
              <Zap className="w-5 h-5" />
              Artwalls vs DIY
            </a>
          </div>
        </div>

        {/* Setup Checklist with Progress */}
        <PartnerKitSection
          id="setup-checklist"
          title="Setup Checklist (≈20 minutes)"
          icon={<CheckCircle className="w-6 h-6" />}
          expanded={expandedSections.checklist}
          onToggle={() => toggleSection('checklist')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Complete these steps to get live and start receiving artist applications:
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text)]">Setup Progress</span>
                <span className="text-sm text-[var(--text-muted)]">0/8 Complete</span>
              </div>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-2">
                <div className="bg-[var(--accent)] h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 mt-6">
              {[
                { step: 1, title: 'Venue Agreement', desc: 'Review and accept partnership terms', time: '2 min', type: 'action-required' },
                { step: 2, title: 'Complete Your Profile', desc: 'Name, address, hours, website, social', time: '3 min', type: 'setup' },
                { step: 3, title: 'Upload 5+ Photos', desc: 'Entrance, walls, ambiance, details', time: '5 min', type: 'setup' },
                { step: 4, title: 'Configure Your Walls', desc: 'Display spots, dimensions, rotation preferences', time: '2 min', type: 'setup' },
                { step: 5, title: 'Categorize Your Space', desc: '2-4 categories matching your venue vibe', time: '1 min', type: 'setup' },
                { step: 6, title: 'Download QR Assets', desc: 'Get poster, table tent, staff card versions', time: '1 min', type: 'setup' },
                { step: 7, title: 'Place QR Codes', desc: 'Install in entrance, counter, restroom, near art', time: '3 min', type: 'setup' },
                { step: 8, title: 'Brief Your Staff', desc: 'Share talking points and how to collect payments', time: '2 min', type: 'setup' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{item.title}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{item.desc}</p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {item.time}
                      </div>
                    </div>
                  </div>
                  <button className="flex-shrink-0 px-3 py-2 text-xs bg-[var(--accent)] text-[var(--accent-contrast)] rounded hover:opacity-90 transition">
                    {item.type === 'action-required' ? 'Complete Now' : 'Start'}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-600">Pro Tip</p>
                  <p className="text-sm text-green-600/80 mt-1">
                    Complete all 8 steps? You'll get 40% more artist applications and featured discovery placement.
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
              Strategic placement increases discovery by 40%. Recommended location breakdown:
            </p>

            <div className="space-y-4">
              {[
                {
                  location: '📍 Entrance/Main Door',
                  why: 'First impression point where everyone enters',
                  placement: 'Eye level, 3-5 feet from entrance',
                  format: 'Large poster version (8.5x11")',
                  impact: '60% of scans',
                },
                {
                  location: '💼 Counter/Register',
                  why: 'Natural pause during transaction',
                  placement: 'Standing easel or laminated card',
                  format: 'Table tent version (4x6")',
                  impact: '25% of scans',
                },
                {
                  location: '🚻 Restroom',
                  why: 'Captive audience with time to explore',
                  placement: 'At eye level, framed or laminated',
                  format: 'Table tent or small poster',
                  impact: '10% of scans',
                },
                {
                  location: '🖼️ Near Displayed Art',
                  why: 'Direct connection to current artwork',
                  placement: 'Below or beside the artwork',
                  format: 'QR sticker or small card',
                  impact: 'Drives immediate purchases',
                },
                {
                  location: '🚪 Exit',
                  why: 'Last chance to engage interested customers',
                  placement: 'Eye level near door',
                  format: 'Small poster or sticker',
                  impact: '5% of scans (follow-up)',
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
                    Monitor engagement by location. Move low-performing codes to higher-traffic spots after 2 weeks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PartnerKitSection>

        {/* Economics Section - Fixed Revenue Display */}
        <PartnerKitSection
          id="economics"
          title="How Earnings Work"
          icon={<TrendingUp className="w-6 h-6" />}
          expanded={expandedSections.economics}
          onToggle={() => toggleSection('economics')}
        >
          <div className="space-y-6">
            <p className="text-[var(--text-muted)]">
              Transparent, consistent economics. Venues earn 15% on every sale. Artists choose their plan (60-85% earnings).
            </p>

            {/* Fixed Economics Breakdown */}
            <div className="space-y-4">
              <p className="font-semibold text-[var(--text)]">Example: $200 Artwork Sale</p>

              {[
                { item: 'Customer Pays (Price + Buyer Fee)', amount: '$209', color: 'text-[var(--text)]', notes: '($200 + $9 buyer support fee)' },
                { item: 'Venue Earns (15% of list price)', amount: '$30', color: 'text-green-600', bold: true, notes: 'Paid to you' },
                { item: 'Buyer Support Fee (4.5%)', amount: '$9', color: 'text-[var(--text-muted)]', notes: 'Paid by customer at checkout' },
                { item: 'Artist Earns (depends on plan)', amount: '$120–$170', color: 'text-blue-600', notes: 'Free to Pro tier' },
              ].map((line, idx) => (
                <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <span className={`font-${line.bold ? 'bold' : 'medium'} text-[var(--text)]`}>
                        {line.item}
                      </span>
                      {line.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{line.notes}</p>}
                    </div>
                    <span className={`font-${line.bold ? 'bold' : 'medium'} ${line.color} flex-shrink-0`}>
                      {line.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Artist Tiers - Updated */}
            <div>
              <p className="font-semibold text-[var(--text)] mb-4">Artist Earnings by Plan</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">On a $200 sale, here's what artists earn:</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Free', rate: '60%', earnings: '$120', desc: 'Perfect for emerging artists' },
                  { name: 'Starter', rate: '80%', earnings: '$160', desc: 'More exposure, support' },
                  { name: 'Growth', rate: '83%', earnings: '$166', desc: 'Growing their business' },
                  { name: 'Pro', rate: '85%', earnings: '$170', desc: 'Premium, priority placement' },
                ].map((tier) => (
                  <div key={tier.name} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="font-bold text-[var(--text)] text-sm mb-1">{tier.name}</p>
                    <p className="text-2xl font-bold text-[var(--accent)] mb-1">{tier.rate}</p>
                    <p className="text-xs text-[var(--text-muted)]">{tier.earnings} on $200</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2">{tier.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Points */}
            <div className="space-y-2">
              <p className="font-semibold text-[var(--text)]">Key Economics Points</p>
              {[
                '✓ You earn 15% on every sale, regardless of artist tier',
                '✓ Buyer support fee (4.5%) is paid by the customer at checkout—not deducted from your earnings',
                '✓ No upfront fees or hidden charges',
                '✓ Payouts processed monthly to your bank account',
                '✓ Artists choose their plan—you benefit either way',
                '✓ More art rotations = more discovery = higher earnings',
              ].map((point, idx) => (
                <p key={idx} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                  <span className="flex-shrink-0">{point.split(' ')[0]}</span>
                  <span>{point.substring(2)}</span>
                </p>
              ))}
            </div>
          </div>
        </PartnerKitSection>

        {/* Artwalls vs DIY Comparison */}
        <PartnerKitSection
          id="comparison"
          title="Artwalls vs Doing It Yourself"
          icon={<Zap className="w-6 h-6" />}
          expanded={expandedSections.comparison}
          onToggle={() => toggleSection('comparison')}
        >
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text)]">Responsibility</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text)]">DIY</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text)] bg-[var(--surface-2)]">Artwalls</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { task: 'Find & vet artists', diy: 'You (many hours)', artwalls: '✓ We do it' },
                    { task: 'Artwork logistics', diy: 'You (shipping, storage)', artwalls: '✓ Artists handle' },
                    { task: 'Payment processing', diy: 'You (Stripe, manual)', artwalls: '✓ We handle it' },
                    { task: 'Payouts to artists', diy: 'You (monthly admin)', artwalls: '✓ Automated' },
                    { task: 'Customer support', diy: 'You (emails, issues)', artwalls: '✓ Our team' },
                    { task: 'Staff training', diy: 'You (create scripts)', artwalls: '✓ We provide it' },
                    { task: 'Marketing materials', diy: 'You (design, print)', artwalls: '✓ We provide PDFs' },
                    { task: 'Dispute resolution', diy: 'You (mediate)', artwalls: '✓ Our team mediates' },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-[var(--border)]">
                      <td className="py-3 px-4 text-[var(--text)]">{row.task}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{row.diy}</td>
                      <td className="py-3 px-4 bg-[var(--surface-2)] text-green-600 font-semibold">{row.artwalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-600">
                <strong>Bottom line:</strong> Artwalls handles all the complexity while you earn 15% from every sale. No staff time. No payments to process. No artist disputes to manage.
              </p>
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
                { title: 'Art Rotation', content: 'Rotate artworks every 30–60 days. More rotations = more discovery = more earnings.' },
                { title: 'Display Standards', content: 'Keep art clean, properly framed/mounted, protected from direct sunlight and moisture.' },
                { title: 'Artist Communication', content: 'Use our platform to keep artists updated on sales, foot traffic, and performance.' },
                { title: 'QR Maintenance', content: 'Check QR codes monthly for damage. Laminate or cover with clear acrylic for durability.' },
                { title: 'Customer Service', content: 'Respond to collector inquiries promptly. Great service = more referrals and repeat visits.' },
                { title: 'Social & Marketing', content: 'Share photos of art on social media, tag artists. This drives traffic for both of you.' },
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
                { scenario: 'Customer: "Who is the artist?"', response: 'Scan the QR code! You\'ll see their profile, story, and can buy if you love it.' },
                { scenario: 'Customer: "How often does this change?"', response: 'Every month or two, depending on sales. Always something new to discover.' },
                { scenario: 'Customer: "Can I buy it?"', response: 'Yes! Scan to view prices and purchase. We ship anywhere.' },
                { scenario: 'Customer: "Are these local artists?"', response: 'Yes, independent artists from our network. Your purchase goes 80%+ to support them.' },
                { scenario: 'Customer: "Why do you display art?"', response: 'It creates a unique vibe, supports emerging talent, and gives you something beautiful to enjoy.' },
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
              <p className="font-medium text-purple-600 mb-2">💡 Frame It This Way</p>
              <p className="text-sm text-purple-600/80">
                "We're giving artists a way to reach collectors, and giving you a way to discover emerging talent. It's a win-win."
              </p>
            </div>
          </div>
        </PartnerKitSection>

        {/* Signage & Assets */}
        <PartnerKitSection
          id="partner-assets"
          title="Partner Kit Assets & Signage"
          icon={<Download className="w-6 h-6" />}
          expanded={false}
          onToggle={() => {}}
        >
          <div className="space-y-6">
            <div>
              <p className="font-semibold text-[var(--text)] mb-4">Download Ready-to-Print Signage</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Large Poster', size: '8.5" × 11"', use: 'Entrance, main wall', icon: '📄' },
                  { name: 'Table Tent', size: '4" × 6"', use: 'Counter, register', icon: '📋' },
                  { name: 'Staff Card', size: '3" × 5"', use: 'Staff reference', icon: '🎫' },
                  { name: 'QR Sticker', size: '2" × 2"', use: 'Near artwork', icon: '📌' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] flex items-center gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--text)] text-sm">{item.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.size} • {item.use}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg text-sm font-semibold hover:opacity-90 transition">
                Download Signage Pack (PDF)
              </button>
              <button className="px-4 py-2 bg-white/10 text-[var(--text)] border border-[var(--border)] rounded-lg text-sm font-semibold hover:bg-white/20 transition">
                Request Help Launching
              </button>
            </div>
          </div>
        </PartnerKitSection>

        {/* Success Stories */}
        <PartnerKitSection
          id="success"
          title="Success Stories from Our Partners"
          icon={<Heart className="w-6 h-6" />}
          expanded={false}
          onToggle={() => {}}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                venue: 'Brew & Art Coffee',
                stat: '$500/month',
                quote: 'Zero admin work. Our customers love discovering new artists while they grab coffee.',
              },
              {
                venue: 'Gallery Café',
                stat: '15+ artists',
                quote: 'The Artwalls team handles everything. We just rotate art and watch earnings grow.',
              },
            ].map((story, idx) => (
              <div key={idx} className="p-6 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <p className="font-bold text-[var(--accent)] text-lg mb-1">{story.stat}</p>
                <p className="font-semibold text-[var(--text)] mb-3">— {story.venue}</p>
                <p className="text-sm text-[var(--text-muted)] italic">"{story.quote}"</p>
              </div>
            ))}
          </div>
        </PartnerKitSection>

        {/* Contact Form */}
        <PartnerKitSection
          id="contact"
          title="Have Questions? Contact Us"
          icon={<Users className="w-6 h-6" />}
          expanded={expandedSections.contact}
          onToggle={() => toggleSection('contact')}
        >
          <div className="space-y-4">
            <p className="text-[var(--text-muted)]">
              Our team is here to help. Fill out the form and we'll get back to you within 24 hours.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@venue.com"
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                  Message *
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us how we can help..."
                  rows={5}
                  className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] resize-vertical"
                  required
                />
              </div>

              <input type="hidden" value="Venue" />

              <button
                type="submit"
                disabled={contactStatus === 'loading'}
                className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                {contactStatus === 'loading' ? 'Sending...' : 'Send Message'}
              </button>

              {contactStatus === 'success' && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-600">✓ Thanks! We'll be in touch within 24 hours.</p>
                </div>
              )}

              {contactStatus === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600">✗ Please fill in all fields before submitting.</p>
                </div>
              )}
            </form>
          </div>
        </PartnerKitSection>

        {/* Final CTA */}
        <div className="mt-12 p-8 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-lg">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Ready to Get Started?</h2>
          <p className="text-[var(--text-muted)] mb-6">
            You've got the full picture. Complete your venue setup and start receiving artist applications.
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
