/**
 * FindCitySelector — /find
 *
 * Entry page for the "Find Art Near You" feature.
 * Users pick a city, then navigate to /find/:citySlug.
 *
 * Layout:
 *  • Hero header with search
 *  • Grid of popular city cards
 *  • Footer
 */

import { useState, useMemo, useCallback } from 'react';
import { MapPin, Search, ArrowRight, Palette } from 'lucide-react';
import { SEO } from '../components/SEO';
import { getUniqueCities, toCitySlug, searchCities } from '../data/cities';
import type { City } from '../data/cities';

// ── Props ───────────────────────────────────────────────────────────────────

interface FindCitySelectorProps {
  onNavigate?: (page: string) => void;
}

// ── Featured cities (shown as cards) ────────────────────────────────────────

const FEATURED_CITY_NAMES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'San Francisco',
  'Miami',
  'Austin',
  'Nashville',
  'Denver',
  'Seattle',
  'Portland',
  'San Diego',
  'Atlanta',
];

// ── Component ───────────────────────────────────────────────────────────────

export function FindCitySelector({ onNavigate }: FindCitySelectorProps) {
  const [query, setQuery] = useState('');

  const allCities = useMemo(() => getUniqueCities(), []);

  const featuredCities = useMemo(
    () =>
      FEATURED_CITY_NAMES.map((name) =>
        allCities.find((c) => c.name === name)
      ).filter(Boolean) as City[],
    [allCities]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchCities(query).slice(0, 12);
  }, [query]);

  const handleCityClick = useCallback(
    (city: City) => {
      const slug = toCitySlug(city.name);
      window.history.pushState({}, '', `/find/${slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    []
  );

  const displayedCities = searchResults ?? featuredCities;
  const isSearching = searchResults !== null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SEO
        title="Find Art Near You — Artwalls"
        description="Discover local venues hosting original artwork on their walls. Browse the map, find art displays in your city, and buy directly from local artists."
        ogTitle="Find Art Near You — Artwalls"
        ogDescription="Explore local venues hosting original artwork. Browse by city, discover artists, and buy art directly from the wall."
        ogUrl="https://artwalls.space/find"
        canonical="https://artwalls.space/find"
      />

      {/* Branding header */}
      <header className="bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl tracking-tight text-[var(--text)] hover:opacity-80 transition-opacity"
          >
            Artwalls
          </a>
        </div>
      </header>

      {/* Hero */}
      <div
        className="py-12 sm:py-16"
        style={{ background: 'var(--surface-1)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}
          >
            <Palette className="w-7 h-7" />
          </div>

          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight font-display tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Find Art Near You
          </h1>
          <p
            className="text-base sm:text-lg mt-3 max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            Discover venues hosting original artwork on their walls.
            Pick a city to explore the map.
          </p>

          {/* Search input */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search cities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm rounded-xl outline-none transition-all
                         focus:ring-2 focus:ring-[var(--blue)]"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        </div>
      </div>

      {/* City grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h2
          className="text-lg font-semibold mb-6"
          style={{ color: 'var(--text)' }}
        >
          {isSearching
            ? `Results for "${query}"`
            : 'Popular Cities'}
        </h2>

        {displayedCities.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No cities found for "{query}". Try a different search.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedCities.map((city) => (
              <button
                key={`${city.name}-${city.state}`}
                type="button"
                onClick={() => handleCityClick(city)}
                className="group text-left rounded-xl p-4 transition-all duration-150
                           hover:scale-[1.02] outline-none focus-visible:ring-2
                           focus-visible:ring-[var(--blue)]"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                      <span
                        className="font-semibold text-sm"
                        style={{ color: 'var(--text)' }}
                      >
                        {city.name}
                      </span>
                    </div>
                    <span
                      className="text-xs mt-0.5 block"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {city.state}
                    </span>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <footer
        className="border-t py-6 text-center text-xs"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <a
          href="/"
          className="hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Artwalls
        </a>
        {' · '}
        <a
          href="/privacy-policy"
          className="hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Privacy
        </a>
        {' · '}
        <a
          href="/terms-of-service"
          className="hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Terms
        </a>
      </footer>
    </div>
  );
}
