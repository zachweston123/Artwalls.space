import { CheckCircle, FileText } from 'lucide-react';

interface AgreementStatusCardProps {
  role: 'artist' | 'venue';
  hasAccepted: boolean;
  acceptedDate?: string;
  acceptedName?: string;
  onNavigate: (page: string) => void;
}

export function AgreementStatusCard({ 
  role, 
  hasAccepted, 
  acceptedDate, 
  acceptedName,
  onNavigate 
}: AgreementStatusCardProps) {
  const agreementPage = role === 'artist' ? 'artist-agreement' : 'venue-agreement';
  const agreementName = role === 'artist' ? 'Artist Agreement' : 'Venue Agreement';
  const isArtist = role === 'artist';

  return (
    <div className="bg-[var(--surface-1)] text-[var(--text)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
            <FileText className={isArtist ? 'w-5 h-5 text-[var(--blue)]' : 'w-5 h-5 text-[var(--green)]'} />
          </div>
          <div>
            <h3 className="text-base mb-1 text-[var(--text)]">{agreementName}</h3>
            <p className="text-sm text-[var(--text-muted)]">Legal agreement status</p>
          </div>
        </div>
        {hasAccepted && (
          <CheckCircle className="w-6 h-6 text-[var(--green)]" />
        )}
      </div>

      {hasAccepted ? (
        <div className="bg-[var(--green-muted)] rounded-lg p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--text)] mb-2">✓ Agreement Accepted</p>
          {acceptedName && (
            <p className="text-xs text-[var(--text)]">Signed by: {acceptedName}</p>
          )}
          {acceptedDate && (
            <p className="text-xs text-[var(--text)]">Date: {acceptedDate}</p>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--text)] mb-3">
            You must accept this agreement to use Artwalls features.
          </p>
          <button
            onClick={() => onNavigate(agreementPage)}
            className={
              isArtist
                ? 'px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm'
                : 'px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors text-sm'
            }
          >
            Review & Accept
          </button>
        </div>
      )}

      <button
        onClick={() => onNavigate(agreementPage)}
        className="mt-4 text-sm text-[var(--blue)] hover:text-[var(--blue-hover)] underline"
      >
        View Full Agreement
      </button>
    </div>
  );
}
