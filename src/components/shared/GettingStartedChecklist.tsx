/**
 * GettingStartedChecklist — persistent "first win" checklist for artist and venue dashboards.
 *
 * Rules:
 * - 3–5 items per role, each with ONE CTA button
 * - Deep-links to the exact screen
 * - Persists until completion (stored in Supabase)
 * - Tracks time-to-first-win
 * - Does NOT block behind Stripe/upgrade
 */
import { useEffect, useState, useCallback } from 'react';
import { Check, ArrowRight, Sparkles, X } from 'lucide-react';
import { trackAnalyticsEvent } from '../../lib/analytics';

type ChecklistItemStatus = 'incomplete' | 'complete';

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  ctaLabel: string;
  targetPage: string;
  status: ChecklistItemStatus;
}

interface GettingStartedChecklistProps {
  role: 'artist' | 'venue';
  userId: string;
  onNavigate: (page: string) => void;
}

// ─── Artist checklist items ─────────────────────────────────────────────────
const ARTIST_ITEMS: Omit<ChecklistItem, 'status'>[] = [
  {
    key: 'profile_complete',
    label: 'Complete your profile',
    description: 'Add bio, city, and art style so venues can find you.',
    ctaLabel: 'Edit Profile',
    targetPage: 'artist-profile',
  },
  {
    key: 'first_artwork',
    label: 'Publish your first artwork',
    description: 'Upload a photo and set a price — it becomes discoverable immediately.',
    ctaLabel: 'Add Artwork',
    targetPage: 'artist-artworks',
  },
  {
    key: 'first_application',
    label: 'Apply to a venue or call',
    description: 'Browse open calls or apply to a venue near you.',
    ctaLabel: 'Find Venues',
    targetPage: 'artist-venues',
  },
];

// ─── Venue checklist items ──────────────────────────────────────────────────
const VENUE_ITEMS: Omit<ChecklistItem, 'status'>[] = [
  {
    key: 'profile_complete',
    label: 'Complete your venue profile',
    description: 'Add name, address, hours, and photos so artists can find you.',
    ctaLabel: 'Edit Profile',
    targetPage: 'venue-profile',
  },
  {
    key: 'first_wall',
    label: 'Add your first wall space',
    description: 'Describe one wall — dimensions, location, and lighting.',
    ctaLabel: 'Add Wall',
    targetPage: 'venue-walls',
  },
  {
    key: 'first_call',
    label: 'Post a call for art',
    description: 'Tell artists what you\u2019re looking for. You\u2019ll start receiving applications.',
    ctaLabel: 'Create Call',
    targetPage: 'venue-calls',
  },
];

export function GettingStartedChecklist({ role, userId, onNavigate }: GettingStartedChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = `artwalls_checklist_dismissed_${role}_${userId}`;
  const SIGNUP_TS_KEY = `artwalls_signup_ts_${userId}`;

  // Record signup timestamp (first visit only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(SIGNUP_TS_KEY)) {
      localStorage.setItem(SIGNUP_TS_KEY, String(Date.now()));
    }
  }, [SIGNUP_TS_KEY]);

  // Load completion status from Supabase
  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      try {
        const { supabase } = await import('../../lib/supabase');
        const templateItems = role === 'artist' ? ARTIST_ITEMS : VENUE_ITEMS;

        if (role === 'artist') {
          const { data } = await supabase
            .from('artists')
            .select('name, bio, city_primary, art_types, profile_photo_url')
            .eq('id', userId)
            .single();

          const profileComplete = !!(data?.name && data?.bio && data?.city_primary);

          const { count: artworkCount } = await supabase
            .from('artworks')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', userId);

          const { count: appCount } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', userId);

          if (mounted) {
            setItems(templateItems.map(t => ({
              ...t,
              status:
                t.key === 'profile_complete' ? (profileComplete ? 'complete' : 'incomplete') :
                t.key === 'first_artwork' ? ((artworkCount ?? 0) > 0 ? 'complete' : 'incomplete') :
                t.key === 'first_application' ? ((appCount ?? 0) > 0 ? 'complete' : 'incomplete') :
                'incomplete',
            })));
          }
        } else {
          // Venue
          const { data } = await supabase
            .from('venues')
            .select('name, address, city_primary')
            .eq('id', userId)
            .single();

          const profileComplete = !!(data?.name && data?.address);

          const { count: wallCount } = await supabase
            .from('wallspaces')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', userId);

          const { count: callCount } = await supabase
            .from('calls_for_art')
            .select('id', { count: 'exact', head: true })
            .eq('venue_id', userId)
            .catch(() => ({ count: 0, data: null, error: null }));

          if (mounted) {
            setItems(templateItems.map(t => ({
              ...t,
              status:
                t.key === 'profile_complete' ? (profileComplete ? 'complete' : 'incomplete') :
                t.key === 'first_wall' ? ((wallCount ?? 0) > 0 ? 'complete' : 'incomplete') :
                t.key === 'first_call' ? ((callCount ?? 0) > 0 ? 'complete' : 'incomplete') :
                'incomplete',
            })));
          }
        }
      } catch {
        // Degrade gracefully — show checklist as all incomplete
        const templateItems = role === 'artist' ? ARTIST_ITEMS : VENUE_ITEMS;
        if (mounted) setItems(templateItems.map(t => ({ ...t, status: 'incomplete' })));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStatus();
    return () => { mounted = false; };
  }, [role, userId]);

  // Check if user dismissed
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
      setDismissed(true);
    }
  }, [STORAGE_KEY]);

  // Track first-win events
  useEffect(() => {
    if (loading || items.length === 0) return;
    const allDone = items.every(i => i.status === 'complete');
    if (allDone) {
      trackFirstWin();
    }
  }, [items, loading]);

  const trackFirstWin = useCallback(() => {
    const signupTs = localStorage.getItem(SIGNUP_TS_KEY);
    const minutes = signupTs
      ? Math.round((Date.now() - Number(signupTs)) / 60000)
      : null;

    trackAnalyticsEvent('onboarding_finished' as any, {
      role,
      stepsCompleted: items.length,
      ...(minutes !== null ? { time_to_first_win_minutes: minutes } : {}),
    });
  }, [items, role, SIGNUP_TS_KEY]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  // Don't show if dismissed, loading, or all complete
  if (dismissed || loading) return null;
  const completedCount = items.filter(i => i.status === 'complete').length;
  const allComplete = completedCount === items.length;
  if (allComplete && items.length > 0) return null;

  const nextItem = items.find(i => i.status === 'incomplete');

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="text-base font-semibold text-[var(--text)]">Getting Started</h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded-full">
            {completedCount}/{items.length}
          </span>
        </div>
        <button onClick={handleDismiss} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1" aria-label="Dismiss checklist">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[var(--surface-3)] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              item.status === 'complete'
                ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20'
                : item === nextItem
                ? 'bg-[var(--surface-3)] border-[var(--accent)]/30'
                : 'bg-[var(--surface-1)] border-[var(--border)]'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              item.status === 'complete'
                ? 'bg-[var(--accent)] text-white'
                : 'border-2 border-[var(--border)]'
            }`}>
              {item.status === 'complete' && <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.status === 'complete' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>
                {item.label}
              </p>
              {item === nextItem && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
              )}
            </div>
            {item === nextItem && (
              <button
                onClick={() => onNavigate(item.targetPage)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition"
              >
                {item.ctaLabel} <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
