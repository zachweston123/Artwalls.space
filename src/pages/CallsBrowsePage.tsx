/**
 * CallsBrowsePage — /calls
 *
 * Public browse page for all open Calls for Art.
 * Filterable by city, sortable by newest / deadline soonest.
 * Each card links to the individual call public page (/calls/:id).
 */

import { useState, useEffect, useMemo } from 'react';
import { Megaphone, MapPin, Clock, Search, ArrowLeft, Filter, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';

interface BrowseCall {
  id: string;
  title: string;
  description: string | null;
  submission_deadline: string | null;
  install_window_start: string | null;
  created_at: string;
  venue_name: string | null;
  venue_city: string | null;
  venue_slug: string | null;
}

type SortMode = 'newest' | 'deadline';

export function CallsBrowsePage() {
  const [calls, setCalls] = useState<BrowseCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  // ── Fetch open calls with venue info ────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from('calls_for_art')
          .select('id, title, description, submission_deadline, install_window_start, created_at, venue_id')
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!mounted || !data) return;

        // Fetch venue names for display
        const venueIds = [...new Set(data.map((c) => c.venue_id))];
        const { data: venues } = await supabase
          .from('venues')
          .select('id, name, city, slug')
          .in('id', venueIds);

        const venueMap = new Map(
          (venues || []).map((v) => [v.id, { name: v.name, city: v.city, slug: v.slug }])
        );

        const enriched: BrowseCall[] = data.map((c) => {
          const v = venueMap.get(c.venue_id);
          return {
            id: c.id,
            title: c.title,
            description: c.description,
            submission_deadline: c.submission_deadline,
            install_window_start: c.install_window_start,
            created_at: c.created_at,
            venue_name: v?.name || null,
            venue_city: v?.city || null,
            venue_slug: v?.slug || null,
          };
        });

        if (mounted) setCalls(enriched);
      } catch (err) {
        console.warn('[CallsBrowse] fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // ── Extract unique cities for chips ─────────────────────────────────────
  const cities = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => { if (c.venue_city) set.add(c.venue_city); });
    return [...set].sort();
  }, [calls]);

  // ── Filter + sort ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...calls];

    // City filter
    if (filterCity) {
      result = result.filter((c) => c.venue_city === filterCity);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.venue_name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortMode === 'deadline') {
      result.sort((a, b) => {
        // Calls with deadlines first, sorted soonest-first
        if (a.submission_deadline && b.submission_deadline) {
          return new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime();
        }
        if (a.submission_deadline) return -1;
        if (b.submission_deadline) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    // 'newest' is already the default order

    return result;
  }, [calls, filterCity, searchQuery, sortMode]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const isNewThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return d.getTime() > weekAgo;
  };

  const deadlineLabel = (dateStr: string | null) => {
    if (!dateStr) return 'Rolling';
    const d = new Date(dateStr);
    const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Closed';
    if (daysLeft <= 7) return `${daysLeft}d left`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SEO
        title="Calls for Art — Artwalls"
        description="Browse open calls for art from venues across the country. Submit your work and get placed in real spaces."
        ogTitle="Calls for Art — Artwalls"
        ogDescription="Browse open calls for art from venues across the country."
      />

      {/* Header */}
      <header
        className="border-b"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a
            href="/"
            className="text-lg tracking-tight hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text)' }}
          >
            Artwalls
          </a>
          <a
            href="/find"
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <MapPin className="w-3.5 h-3.5" /> Find venues
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight mb-2">
            Calls for Art
          </h1>
          <p className="text-[var(--text-muted)] max-w-xl">
            Open opportunities from venues looking for artists. Apply with your existing portfolio — no fees required.
          </p>
        </div>

        {/* Toolbar: search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search calls or venues…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-[var(--blue)]"
              style={{
                background: 'var(--surface-1)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortMode('newest')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                sortMode === 'newest'
                  ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortMode('deadline')}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                sortMode === 'deadline'
                  ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <CalendarDays className="w-3 h-3 inline mr-1" />
              Deadline
            </button>
          </div>
        </div>

        {/* City filter chips */}
        {cities.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterCity('')}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                !filterCity
                  ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                  : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              All cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setFilterCity(filterCity === city ? '' : city)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  filterCity === city
                    ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
                    : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 h-36" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <h2 className="text-lg font-semibold mb-1">No open calls right now</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-6">
              {filterCity
                ? `No open calls in ${filterCity}. Try another city or check back soon.`
                : 'Venues are posting new calls every week. Check back soon or browse venues directly.'}
            </p>
            <div className="flex gap-3 justify-center">
              {filterCity && (
                <button
                  onClick={() => setFilterCity('')}
                  className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  Show all cities
                </button>
              )}
              <a
                href="/find"
                className="px-4 py-2 text-sm bg-[var(--blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Browse venues
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              {filtered.length} open call{filtered.length !== 1 ? 's' : ''}
              {filterCity ? ` in ${filterCity}` : ''}
            </p>
            {filtered.map((call) => (
              <a
                key={call.id}
                href={`/calls/${call.id}`}
                className="block bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--blue)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold text-[var(--text)] group-hover:text-[var(--blue)] transition-colors leading-snug">
                    {call.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {isNewThisWeek(call.created_at) && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-600 rounded-full font-medium">
                        New
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {deadlineLabel(call.submission_deadline)}
                    </span>
                  </div>
                </div>
                {call.description && (
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">
                    {call.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  {call.venue_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {call.venue_name}
                      {call.venue_city ? `, ${call.venue_city}` : ''}
                    </span>
                  )}
                  {call.install_window_start && (
                    <span>
                      Install: {new Date(call.install_window_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* CTA for venues */}
        <div className="mt-16 text-center border-t border-[var(--border)] pt-10">
          <h3 className="text-lg font-semibold mb-2">Are you a venue?</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-4">
            Post a call for art and start receiving applications from local artists — always free for venues.
          </p>
          <a
            href="/venue/signup"
            className="inline-block px-5 py-2.5 bg-[var(--blue)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Get started free
          </a>
        </div>
      </div>
    </div>
  );
}
