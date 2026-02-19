/**
 * FoundingVenueCard — dashboard module for the Founding Venue program.
 * Shows:
 *  - If NOT founding: perks summary + CTA to request status
 *  - If founding: badge, featured-until date, share button, install kit request
 */

import { useState, useEffect } from 'react';
import { Award, Package, Share2, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { FoundingVenueBadge } from './FoundingVenueBadge';

interface FoundingVenueCardProps {
  userId: string;
  onNavigate: (page: string) => void;
}

interface FoundingStatus {
  isFounding: boolean;
  foundingEnd: string | null;
  featuredUntil: string | null;
  kitRequestedAt: string | null;
}

export function FoundingVenueCard({ userId, onNavigate }: FoundingVenueCardProps) {
  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [kitRequesting, setKitRequesting] = useState(false);
  const [kitRequested, setKitRequested] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await supabase
          .from('venues')
          .select('is_founding,founding_end,featured_until,founder_kit_requested_at')
          .eq('id', userId)
          .maybeSingle();

        if (!cancelled && data) {
          const isFounding = data.is_founding === true
            && data.founding_end
            && new Date(data.founding_end) > new Date();
          setStatus({
            isFounding: Boolean(isFounding),
            foundingEnd: data.founding_end,
            featuredUntil: data.featured_until,
            kitRequestedAt: data.founder_kit_requested_at,
          });
          setKitRequested(Boolean(data.founder_kit_requested_at));
        }
      } catch (err) {
        console.warn('Failed to load founding status', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleRequestFounding = async () => {
    setRequesting(true);
    try {
      // Create a support request to ask for founding status
      await apiPost('/api/support', {
        message: 'I would like to request Founding Venue status for my venue.',
        roleContext: 'venue',
        pageSource: 'venue-dashboard',
      });
      setRequestSent(true);
    } catch (err) {
      console.error('Failed to request founding status', err);
    } finally {
      setRequesting(false);
    }
  };

  const handleRequestKit = async () => {
    setKitRequesting(true);
    try {
      await apiPost<{ ok: boolean }>('/api/venues/request-install-kit', {
        note: '',
      });
      setKitRequested(true);
    } catch (err) {
      console.error('Failed to request install kit', err);
    } finally {
      setKitRequesting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/venues/${userId}`;
    if (navigator.share) {
      navigator.share({ title: 'Check out our Featured Wall at Artwalls', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Venue link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  // ── Active founding venue ──
  if (status?.isFounding) {
    return (
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-6 border border-amber-500/30">
        <div className="flex items-start justify-between mb-4">
          <FoundingVenueBadge variant="full" featuredUntil={status.featuredUntil} />
        </div>

        <p className="text-sm text-[var(--text-muted)] mb-5">
          Your venue is featured in discovery lists and on public pages. Artists see your profile first!
        </p>

        <div className="flex flex-wrap gap-3">
          {/* Share button */}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share your wall page
          </button>

          {/* Install kit request */}
          {kitRequested ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Install kit requested
            </div>
          ) : (
            <button
              onClick={handleRequestKit}
              disabled={kitRequesting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {kitRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Request free install kit
            </button>
          )}

          {/* Performance link */}
          <button
            onClick={() => onNavigate('venue-performance')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View performance
          </button>
        </div>
      </div>
    );
  }

  // ── Not founding — show perks + CTA ──
  return (
    <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-[var(--text)]">Founding Venue Program</h3>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-4">
        Early venues get premium perks for 60 days:
      </p>

      <ul className="text-sm text-[var(--text-muted)] space-y-2 mb-5">
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span><strong className="text-[var(--text)]">Featured placement</strong> — appear first in artist discovery</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span><strong className="text-[var(--text)]">Founding badge</strong> — on your public profile and venue cards</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span><strong className="text-[var(--text)]">Free install kit</strong> — everything you need for your first display</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span><strong className="text-[var(--text)]">Performance reports</strong> — weekly scans + monthly commission statements</span>
        </li>
      </ul>

      {requestSent ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
          <CheckCircle className="w-4 h-4" />
          Request sent! We'll review your venue and get back to you.
        </div>
      ) : (
        <button
          onClick={handleRequestFounding}
          disabled={requesting}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
          Request Founding Venue Status
        </button>
      )}
    </div>
  );
}
