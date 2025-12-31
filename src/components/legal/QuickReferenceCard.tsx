import { DollarSign, Calendar, Shield, AlertCircle } from 'lucide-react';

interface QuickReferenceCardProps {
  role: 'artist' | 'venue';
  onNavigate: (page: string) => void;
}

export function QuickReferenceCard({ role, onNavigate }: QuickReferenceCardProps) {
  const accentColor = role === 'artist' ? 'blue' : 'green';
  const agreementPage = role === 'artist' ? 'artist-agreement' : 'venue-agreement';

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
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-neutral-900">Agreement Quick Reference</h3>
        <button
          onClick={() => onNavigate(agreementPage)}
          className={`text-sm text-${accentColor}-600 hover:text-${accentColor}-700 underline`}
        >
          View Full Terms
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {facts.map((fact, index) => {
          const Icon = fact.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`w-8 h-8 bg-${accentColor}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 text-${accentColor}-600`} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">{fact.label}</p>
                <p className="text-sm text-neutral-900">{fact.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
