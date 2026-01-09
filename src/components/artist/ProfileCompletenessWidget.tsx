import { AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { 
  calculateProfileCompleteness, 
  getProfileLevel, 
  getSalesImpactMessage,
  getCompletionColor,
  getCompletionBgColor,
  type ArtistProfile,
  type ProfileCompleteness
} from '../../lib/profileCompleteness';

interface ProfileCompletenessWidgetProps {
  profile: ArtistProfile;
  onEditProfile: () => void;
  compact?: boolean;
}

export function ProfileCompletenessWidget({
  profile,
  onEditProfile,
  compact = false
}: ProfileCompletenessWidgetProps) {
  const completeness = calculateProfileCompleteness(profile);
  const level = getProfileLevel(completeness.percentage);
  const salesMessage = getSalesImpactMessage(level);
  const bgColor = getCompletionBgColor(completeness.percentage);
  const textColor = getCompletionColor(completeness.percentage);

  if (compact) {
    // Compact version for dashboards/sidebars
    return (
      <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Target className={`w-4 h-4 ${textColor}`} />
          <span className="text-xs font-semibold text-[var(--text)]">Profile Completeness</span>
          <span className={`text-xs font-bold ${textColor}`}>{completeness.percentage}%</span>
        </div>
        <div className="w-full bg-[var(--surface-3)] rounded-full h-1.5">
          <div
            className={`h-full rounded-full transition-all ${bgColor}`}
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
        {!completeness.isComplete && (
          <p className="text-xs text-[var(--text-muted)] mt-2">{completeness.nextStep}</p>
        )}
      </div>
    );
  }

  // Full version for profile page
  return (
    <div className="mb-6 bg-gradient-to-r from-[var(--surface-2)] to-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`text-2xl flex-shrink-0`}>
          {completeness.percentage === 100 ? '✨' : completeness.percentage >= 75 ? '⭐' : completeness.percentage >= 50 ? '📈' : '🚀'}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[var(--text)]">Complete Your Profile</h3>
            <span className={`text-sm font-bold ${textColor}`}>{completeness.percentage}%</span>
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-4">
            {salesMessage}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-[var(--surface-3)] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
          </div>

          {/* Completed Items */}
          {completeness.completed.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[var(--text-muted)] mb-2">✅ Completed:</p>
              <div className="flex flex-wrap gap-2">
                {completeness.completed.map((item) => (
                  <span key={item} className="text-xs px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full">
                    {formatFieldName(item)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Items */}
          {completeness.missing.length > 0 && completeness.percentage < 100 && (
            <div className="mb-4">
              <p className="text-xs text-[var(--text-muted)] mb-2">Add Next:</p>
              <ul className="space-y-2">
                {completeness.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                    <span className="text-[var(--accent)] mt-1">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={onEditProfile}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              completeness.percentage === 100
                ? 'bg-[var(--green)] hover:bg-[var(--green-hover)] text-[var(--on-green)]'
                : 'bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)]'
            }`}
          >
            {completeness.percentage === 100 ? 'Profile Complete ✨' : 'Complete Your Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline profile completion alert for first-time users
 */
export function ProfileIncompleteAlert({
  profile,
  onEditProfile
}: Omit<ProfileCompletenessWidgetProps, 'compact'>) {
  const completeness = calculateProfileCompleteness(profile);

  if (completeness.isComplete || completeness.percentage > 75) {
    return null; // Don't show if profile is mostly complete
  }

  return (
    <div className="mb-4 p-4 border-l-4 border-[var(--accent)] bg-[var(--surface-2)] rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-[var(--text)] mb-1">Increase Your Sales with a Complete Profile</p>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Venues prefer artists with detailed profiles. {completeness.nextStep} to improve visibility and attract more sales.
          </p>
          <button
            onClick={onEditProfile}
            className="text-sm text-[var(--blue)] hover:text-[var(--blue-hover)] font-medium transition-colors"
          >
            Edit Profile Now →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mini completion indicator for lists/tables
 */
export function CompletionBadge({ profile }: { profile: ArtistProfile }) {
  const completeness = calculateProfileCompleteness(profile);
  const color = getCompletionColor(completeness.percentage);

  if (completeness.percentage === 100) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
        <span className="text-xs text-[var(--green)] font-medium">Complete</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 w-12 h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
        <div
          className={`h-full ${getCompletionBgColor(completeness.percentage)}`}
          style={{ width: `${completeness.percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${color}`}>{completeness.percentage}%</span>
    </div>
  );
}

// Helper function to format field names for display
function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    name: 'Display Name',
    photo: 'Profile Photo',
    bio: 'Bio',
    artTypes: 'Art Types',
    location: 'Location',
    phone: 'Phone',
    portfolio: 'Portfolio',
    social: 'Social Media',
  };
  return names[field] || field;
}
