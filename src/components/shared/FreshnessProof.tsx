/**
 * FreshnessProof — "social proof" widgets that use activity freshness
 * instead of vanity metrics. Designed for homepage, /find, and pricing pages.
 *
 * Shows: newest venues, newest artists, newest calls, and a featured wall.
 * All data is lazy-loaded and cached in component state.
 */
import { useEffect, useState } from 'react';
import { MapPin, Palette, Store, Megaphone, Sparkles } from 'lucide-react';

interface FreshItem {
  id: string;
  name: string;
  city?: string;
  created_at?: string;
}

interface FreshnessProofProps {
  /** Which modules to show */
  modules?: Array<'venues' | 'artists' | 'calls'>;
  /** Max items per module */
  limit?: number;
  /** Optional heading override */
  heading?: string;
}

export function FreshnessProof({
  modules = ['venues', 'artists', 'calls'],
  limit = 4,
  heading = 'What\u2019s happening on Artwalls',
}: FreshnessProofProps) {
  const [venues, setVenues] = useState<FreshItem[]>([]);
  const [artists, setArtists] = useState<FreshItem[]>([]);
  const [calls, setCalls] = useState<FreshItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadFreshData() {
      try {
        const { supabase } = await import('../../lib/supabase');

        const promises: Promise<void>[] = [];

        if (modules.includes('venues')) {
          promises.push(
            supabase
              .from('venues')
              .select('id, name, city_primary, created_at')
              .order('created_at', { ascending: false })
              .limit(limit)
              .then(({ data }) => {
                if (mounted && data) setVenues(data.map(v => ({ id: v.id, name: v.name, city: v.city_primary, created_at: v.created_at })));
              })
          );
        }

        if (modules.includes('artists')) {
          promises.push(
            supabase
              .from('artists')
              .select('id, name, city_primary, created_at')
              .eq('is_public', true)
              .order('created_at', { ascending: false })
              .limit(limit)
              .then(({ data }) => {
                if (mounted && data) setArtists(data.map(a => ({ id: a.id, name: a.name, city: a.city_primary, created_at: a.created_at })));
              })
          );
        }

        if (modules.includes('calls')) {
          promises.push(
            supabase
              .from('calls_for_art')
              .select('id, title, created_at')
              .eq('status', 'open')
              .order('created_at', { ascending: false })
              .limit(limit)
              .then(({ data }) => {
                if (mounted && data) setCalls(data.map(c => ({ id: c.id, name: c.title, created_at: c.created_at })));
              })
              .catch(() => {
                // calls_for_art table may not exist yet — silently skip
              })
          );
        }

        await Promise.allSettled(promises);
      } catch {
        // Non-critical — degrade gracefully
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadFreshData();
    return () => { mounted = false; };
  }, [modules.join(','), limit]);

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  // Don't render if no data came back
  const hasData = venues.length > 0 || artists.length > 0 || calls.length > 0;
  if (!loading && !hasData) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg sm:text-xl font-semibold text-[var(--text)] text-center mb-10 font-display tracking-tight">
          {heading}
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--blue)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Newest Venues */}
            {venues.length > 0 && (
              <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--green)] mb-4 flex items-center gap-2">
                  <Store className="w-4 h-4" /> New Venues
                </h3>
                <ul className="space-y-2">
                  {venues.map(v => (
                    <li key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)] truncate">{v.name}</span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2 flex items-center gap-1">
                        {v.city && <><MapPin className="w-3 h-3" />{v.city}</>}
                        {!v.city && timeAgo(v.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Newest Artists */}
            {artists.length > 0 && (
              <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--blue)] mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> New Artists
                </h3>
                <ul className="space-y-2">
                  {artists.map(a => (
                    <li key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)] truncate">{a.name}</span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2 flex items-center gap-1">
                        {a.city && <><MapPin className="w-3 h-3" />{a.city}</>}
                        {!a.city && timeAgo(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Newest Calls */}
            {calls.length > 0 && (
              <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Open Calls
                </h3>
                <ul className="space-y-2">
                  {calls.map(c => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text)] truncate">{c.name}</span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">{timeAgo(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Soft language — no vanity numbers */}
        {hasData && (
          <p className="text-center text-xs text-[var(--text-muted)] mt-8 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> New artists and venues joining every week
          </p>
        )}
      </div>
    </section>
  );
}
