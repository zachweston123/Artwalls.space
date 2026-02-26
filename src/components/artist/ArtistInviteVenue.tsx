import { useState } from 'react';
import { apiPost } from '../../lib/api';
import { CheckCircle, AlertCircle, Gift } from 'lucide-react';

interface ArtistInviteVenueProps {
  onNavigate?: (page: string) => void;
}

export function ArtistInviteVenue({ onNavigate }: ArtistInviteVenueProps) {
  const [venueName, setVenueName] = useState('');
  const [venueEmail, setVenueEmail] = useState('');
  const [venueWebsite, setVenueWebsite] = useState('');
  const [venueLocationText, setVenueLocationText] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetSuccess = () => setSuccess(null);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!venueName.trim()) {
      setError('Venue name is required.');
      return;
    }
    if (!venueEmail.trim() || !isValidEmail(venueEmail)) {
      setError('Please enter a valid venue email.');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/api/referrals/create', {
        venueName: venueName.trim(),
        venueEmail: venueEmail.trim(),
        venueWebsite: venueWebsite.trim() || null,
        venueLocationText: venueLocationText.trim() || null,
        note: note.trim() || null,
      });
      setSuccess('Invite sent. We’ll let you know when they sign up.');
      setVenueName('');
      setVenueEmail('');
      setVenueWebsite('');
      setVenueLocationText('');
      setNote('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Invite a Venue</h1>
          <p className="text-sm text-[var(--text-muted)]">Send a warm invite to a venue you love.</p>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('artist-referrals')}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
          >
            View referrals
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-[var(--green-muted)] border border-[var(--border)] text-[var(--green)] px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{success}</span>
          <button onClick={resetSuccess} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Reward callout */}
      <div className="flex items-start gap-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4">
        <Gift className="w-5 h-5 text-[var(--blue)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Earn 1 free month of Starter</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            When your invited venue signs up and publishes their first call for art, you get a free month of Starter ($9 value).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-sm text-[var(--text-muted)]">Venue name</label>
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
            placeholder="Cafe Luna"
            required
          />
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)]">Venue email</label>
          <input
            type="email"
            value={venueEmail}
            onChange={(e) => setVenueEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
            placeholder="hello@cafeluna.com"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)]">Website (optional)</label>
            <input
              value={venueWebsite}
              onChange={(e) => setVenueWebsite(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              placeholder="https://cafeluna.com"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Address or neighborhood (optional)</label>
            <input
              value={venueLocationText}
              onChange={(e) => setVenueLocationText(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              placeholder="Pearl District"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-[var(--text-muted)]">Personal note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] min-h-[120px]"
            placeholder="Hi! I love your space and think rotating local art would be a great fit..."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">Limit: up to 5 invites per day.</p>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] font-semibold disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}
