import { AlertCircle } from 'lucide-react';

interface AgreementBannerProps {
  role: 'artist' | 'venue';
  onNavigate: (page: string) => void;
}

export function AgreementBanner({ role, onNavigate }: AgreementBannerProps) {
  const agreementPage = role === 'artist' ? 'artist-agreement' : 'venue-agreement';
  const agreementName = role === 'artist' ? 'Artist Agreement' : 'Venue Agreement';

  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-6 text-[var(--text)]">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm mb-1 font-semibold">Action Required</h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Please accept the {agreementName} to continue using Artwalls features.
          </p>
          <button
            onClick={() => onNavigate(agreementPage)}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg transition-colors text-sm font-medium"
          >
            Review & Accept Agreement
          </button>
        </div>
      </div>
    </div>
  );
}
