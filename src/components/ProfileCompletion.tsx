import { useState } from 'react';
import { AlertCircle, Phone } from 'lucide-react';

interface ProfileCompletionProps {
  email: string;
  userName: string;
  onComplete: (phoneNumber: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

/**
 * ProfileCompletion component
 * Captures phone number after Google OAuth sign-in if not already provided.
 * Stores phone in user metadata for retrieval on future sign-ins.
 */
export function ProfileCompletion({
  email,
  userName,
  onComplete,
  onSkip,
  isLoading = false,
}: ProfileCompletionProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const phoneTrim = phone.replace(/\D/g, '').trim();

    if (!phoneTrim) {
      setError('Please enter a valid phone number');
      return;
    }

    if (phoneTrim.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    onComplete(phoneTrim);
  };

  return (
    <div className="min-h-svh bg-[var(--bg)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--blue-muted)] flex items-center justify-center">
            <Phone className="w-7 h-7 text-[var(--blue)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">One More Step</h1>
          <p className="text-[var(--text-muted)] text-sm">
            Please provide your phone number so we can keep you updated about your artwork and venue partnerships.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Info Display */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4 space-y-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Name
              </label>
              <p className="text-[var(--text)] mt-1">{userName}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Email
              </label>
              <p className="text-[var(--text)] mt-1 break-all">{email}</p>
            </div>
          </div>

          {/* Phone Input */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-[var(--text)] mb-2"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border-2 border-[var(--border)] rounded-lg text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--blue)] disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="tel"
              required
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              We'll use this to contact you about orders and partnerships.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-3 rounded flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-[var(--border)] text-[var(--text)] font-medium hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--blue)] text-white font-medium hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Your information is securely stored and never shared without your permission.
        </p>
      </div>
    </div>
  );
}
