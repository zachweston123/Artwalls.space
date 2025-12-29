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
  const accentColor = role === 'artist' ? 'blue' : 'green';

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-${accentColor}-100 rounded-lg flex items-center justify-center`}>
            <FileText className={`w-5 h-5 text-${accentColor}-600`} />
          </div>
          <div>
            <h3 className="text-base mb-1 text-neutral-900 dark:text-neutral-50">{agreementName}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Legal agreement status</p>
          </div>
        </div>
        {hasAccepted && (
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        )}
      </div>

      {hasAccepted ? (
        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-100 dark:border-green-900">
          <p className="text-sm text-green-900 dark:text-green-200 mb-2">✓ Agreement Accepted</p>
          {acceptedName && (
            <p className="text-xs text-green-700 dark:text-green-300">Signed by: {acceptedName}</p>
          )}
          {acceptedDate && (
            <p className="text-xs text-green-700 dark:text-green-300">Date: {acceptedDate}</p>
          )}
        </div>
      ) : (
        <div className={`bg-${accentColor}-50 rounded-lg p-4 border border-${accentColor}-100`}>
          <p className={`text-sm text-${accentColor}-900 mb-3`}>
            You must accept this agreement to use Artwalls features.
          </p>
          <button
            onClick={() => onNavigate(agreementPage)}
            className={`px-4 py-2 bg-${accentColor}-600 text-white rounded-lg hover:bg-${accentColor}-700 transition-colors text-sm`}
          >
            Review & Accept
          </button>
        </div>
      )}

      <button
        onClick={() => onNavigate(agreementPage)}
        className="mt-4 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:text-neutral-50 underline"
      >
        View Full Agreement
      </button>
    </div>
  );
}
