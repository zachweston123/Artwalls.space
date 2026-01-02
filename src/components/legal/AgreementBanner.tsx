import { AlertCircle } from 'lucide-react';

interface AgreementBannerProps {
  role: 'artist' | 'venue';
  onNavigate: (page: string) => void;
}

export function AgreementBanner({ role, onNavigate }: AgreementBannerProps) {
  const agreementPage = role === 'artist' ? 'artist-agreement' : 'venue-agreement';
  const agreementName = role === 'artist' ? 'Artist Agreement' : 'Venue Agreement';
  const bgColor = role === 'artist' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20';
  const borderColor = role === 'artist' ? 'border-blue-200 dark:border-blue-700' : 'border-green-200 dark:border-green-700';
  const textColor = role === 'artist' ? 'text-blue-900 dark:text-blue-100' : 'text-green-900 dark:text-green-100';
  const iconColor = role === 'artist' ? 'text-blue-600 dark:text-blue-300' : 'text-green-600 dark:text-green-300';
  const buttonBg = role === 'artist' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-xl p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm ${textColor} mb-1 font-semibold`}>Action Required</h3>
          <p className={`text-sm ${textColor} opacity-90 mb-3`}>
            Please accept the {agreementName} to continue using Artwalls features.
          </p>
          <button
            onClick={() => onNavigate(agreementPage)}
            className={`px-4 py-2 ${buttonBg} text-white rounded-lg transition-colors text-sm font-medium`}
          >
            Review & Accept Agreement
          </button>
        </div>
      </div>
    </div>
  );
}
