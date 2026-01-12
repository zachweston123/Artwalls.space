import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function VenuePartnerKit({ onNavigate }: any) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 px-4 py-16">
        <h1 className="text-4xl font-bold text-[var(--accent-contrast)] mb-4">Venue Partner Kit</h1>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Earn 15% From Every Sale</h2>
          <p className="text-[var(--text-muted)] mb-6">Turn your walls into revenue with Artwalls.</p>
          <button onClick={() => onNavigate?.('venues-apply')} className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg">Apply Now</button>
        </div>
      </div>
    </div>
  );
}
