import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';

export interface SetupHealthChecklistProps {
  photosAdded: boolean;
  profilePublished: boolean;
  wallConfigured: boolean;
  qrDownloaded: boolean;
  qrPlacementConfirmed: boolean;
  sharedVenuePage: boolean;
  onNavigate?: (page: string, params?: any) => void;
}

export function SetupHealthChecklist({
  photosAdded,
  profilePublished,
  wallConfigured,
  qrDownloaded,
  qrPlacementConfirmed,
  sharedVenuePage,
  onNavigate,
}: SetupHealthChecklistProps) {
  const items = [
    {
      id: 'photos',
      label: 'Photos Added',
      completed: photosAdded,
      icon: '📸',
      link: 'venue-profile',
      description: 'Upload at least 3 venue photos',
    },
    {
      id: 'published',
      label: 'Profile Published',
      completed: profilePublished,
      icon: '✨',
      link: 'venue-profile',
      description: 'Make your profile visible to artists',
    },
    {
      id: 'wall',
      label: 'Wall Configured',
      completed: wallConfigured,
      icon: '🖼️',
      link: 'venue-walls',
      description: 'Set up your display spaces',
    },
    {
      id: 'qr-download',
      label: 'QR Assets Downloaded',
      completed: qrDownloaded,
      icon: '📥',
      link: 'venue-settings',
      description: 'Get poster and table tent versions',
    },
    {
      id: 'qr-placement',
      label: 'QR Placement Confirmed',
      completed: qrPlacementConfirmed,
      icon: '📍',
      link: 'venue-settings',
      description: 'Placed QR codes in recommended spots',
    },
    {
      id: 'share',
      label: 'Shared Venue Page',
      completed: sharedVenuePage,
      icon: '🔗',
      link: 'venue-profile',
      description: 'Optional: Share your profile with contacts',
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6 mb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Setup Health Checklist</h2>
          <span className="text-sm font-semibold text-[var(--accent)]">
            {completedCount}/{totalCount} Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[var(--surface-2)] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          {completionPercentage}% setup complete
        </p>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition ${
              item.completed
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-[var(--surface-2)] border-[var(--border)]'
            }`}
          >
            {/* Checkbox */}
            <div className="mt-0.5 flex-shrink-0">
              {item.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-[var(--text-muted)]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <h3 className={`font-semibold ${item.completed ? 'text-green-600' : 'text-[var(--text)]'}`}>
                  {item.label}
                </h3>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>
            </div>

            {/* Action */}
            {!item.completed && (
              <button
                onClick={() => onNavigate?.(item.link)}
                className="mt-0.5 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition flex items-center gap-2 flex-shrink-0"
              >
                Go
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Status Message */}
      <div className="mt-6 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
        {completionPercentage === 100 ? (
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-600">You're all set! 🎉</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Your venue is fully set up. Artists will start discovering you now.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-600">
                {6 - completedCount} step{6 - completedCount !== 1 ? 's' : ''} to go
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Complete the remaining items to maximize your visibility to artists.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
