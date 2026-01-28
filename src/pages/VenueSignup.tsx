import { useEffect, useMemo, useState } from 'react';
import { Login } from '../components/Login';
import type { User } from '../App';
import { apiGet } from '../lib/api';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface VenueSignupProps {
  onLogin: (user: User) => void;
  onNavigate?: (page: string) => void;
}

export default function VenueSignup({ onLogin, onNavigate }: VenueSignupProps) {
  const [artistName, setArtistName] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || '';
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadReferral() {
      if (!token) return;
      try {
        const resp = await apiGet<{ referral: { venue_name: string }; artist?: { name?: string | null } | null }>(`/api/referrals/token/${encodeURIComponent(token)}`);
        if (!mounted) return;
        setArtistName(resp.artist?.name || 'An artist on Artwalls');
        setVenueName(resp.referral?.venue_name || null);
        localStorage.setItem('venueReferralToken', token);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Referral not found.');
      }
    }
    loadReferral();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {token && !error && (
          <div className="mb-6 bg-[var(--green-muted)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--green)] flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Invited by {artistName || 'an artist'}{venueName ? ` for ${venueName}` : ''}.
          </div>
        )}
        {error && (
          <div className="mb-6 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--danger)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Login
          onLogin={onLogin}
          onNavigate={onNavigate}
          defaultRole="venue"
          lockRole
          referralToken={token}
        />
      </div>
    </div>
  );
}
