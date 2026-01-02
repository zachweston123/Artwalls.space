import { DollarSign, Calendar, Shield, AlertCircle } from 'lucide-react';

interface QuickReferenceCardProps {
  role: 'artist' | 'venue';
  onNavigate: (page: string) => void;
}

export function QuickReferenceCard({ role, onNavigate }: QuickReferenceCardProps) {
  const isArtist = role === 'artist';
  const agreementPage = role === 'artist' ? 'artist-agreement' : 'venue-agreement';
  const accentTextClass = isArtist ? 'text-[var(--blue)]' : 'text-[var(--green)]';
  const accentIconClass = accentTextClass;

  const artistQuickFacts = [
    { icon: DollarSign, label: 'Your Earnings', value: '80% of sale price' },
    { icon: Calendar, label: 'Install Scheduling', value: 'Weekly venue windows' },
    { icon: Shield, label: 'Sales Policy', value: 'All sales final' },
    { icon: AlertCircle, label: 'Display Risk', value: 'Public venue inherent risk' },
  ];

  const venueQuickFacts = [
    { icon: DollarSign, label: 'Your Commission', value: '10% of sale price' },
    { icon: Calendar, label: 'Install Window', value: 'Set weekly schedule' },
    { icon: Shield, label: 'Duty of Care', value: 'Reasonable care required' },
    { icon: AlertCircle, label: 'Incident Reporting', value: 'Notify within 48 hours' },
  ];

  const facts = role === 'artist' ? artistQuickFacts : venueQuickFacts;

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-[var(--text)]">Agreement Quick Reference</h3>
        <button
          onClick={() => onNavigate(agreementPage)}
          className={`text-sm underline hover:opacity-90 ${accentTextClass}`}
        >
          View Full Terms
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {facts.map((fact, index) => {
          const Icon = fact.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--surface-2)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${accentIconClass}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">{fact.label}</p>
                <p className="text-sm text-[var(--text)]">{fact.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
