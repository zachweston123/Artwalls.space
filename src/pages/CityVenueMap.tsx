/**
 * CityVenueMap — /find/:citySlug
 *
 * Split-panel page showing a Leaflet map on the left and a scrollable
 * venue list on the right. Inspired by TooGoodToGo / Zillow map-list UX.
 *
 * Layout (desktop):  [  Map (60%)  |  List (40%)  ]
 * Layout (mobile):   Map above → scrollable list below
 */

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  MapPin,
  ArrowLeft,
  Search,
  Store,
  ChevronDown,
  List,
  Map as MapIcon,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { getCityBySlug, toCitySlug, getUniqueCities, getNearestCities } from '../data/cities';
import type { City } from '../data/cities';
import { fetchVenuesForCity, fetchNearbyVenues } from '../lib/venueMap';
import type { MapVenue } from '../lib/venueMap';
import { VenueMapCard, VenueMapCardSkeleton } from '../components/map/VenueMapCard';
import { SEO } from '../components/SEO';

// Lazy-load the map (Leaflet is heavy)
const VenueMap = lazy(
  () => import('../components/map/VenueMap').then((m) => ({ default: m.VenueMap }))
);

// ── Props ───────────────────────────────────────────────────────────────────

interface CityVenueMapProps {
  citySlug: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function CityVenueMap({ citySlug }: CityVenueMapProps) {
  // City resolution
  const city = useMemo(() => getCityBySlug(citySlug), [citySlug]);

  // State
  const [venues, setVenues] = useState<MapVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterChip, setFilterChip] = useState<'all' | 'accepting' | 'new'>('all');

  // Nearby cities
  const nearbyCities = useMemo(() => {
    if (!city) return [];
    return getNearestCities(city, 100).slice(0, 6);
  }, [city]);

  // Fetch venues
  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // First try exact city_slug match, then fallback to geo query
        let results = await fetchVenuesForCity(citySlug, city, 50);
        if (results.length === 0) {
          results = await fetchNearbyVenues(city, 50);
        }
        if (!cancelled) setVenues(results);
      } catch (err) {
        console.warn('[CityVenueMap] fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [citySlug, city]);

  // Filter venues by search + chip filters
  const filteredVenues = useMemo(() => {
    let result = venues;

    // Chip filters
    if (filterChip === 'accepting') {
      result = result.filter((v) => v.hasOpenCalls);
    } else if (filterChip === 'new') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((v) => v.createdAt && new Date(v.createdAt).getTime() > weekAgo);
    }

    // Text search
    if (!filterQuery.trim()) return result;
    const q = filterQuery.toLowerCase();
    return result.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.type && v.type.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q))
    );
  }, [venues, filterQuery, filterChip]);

  // Navigate to venue profile
  const handleViewProfile = useCallback((venue: MapVenue) => {
    const url = venue.slug ? `/venues/${venue.slug}` : `/venues/${venue.id}`;
    window.open(url, '_blank');
  }, []);

  // Navigate to different city
  const handleCitySwitch = useCallback((c: City) => {
    const slug = toCitySlug(c.name);
    window.history.pushState({}, '', `/find/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // ── 404 city ──────────────────────────────────────────────────────────────

  if (!city) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
          <h2 className="text-xl font-semibold mb-2">City not found</h2>
          <p className="text-sm mb-6 text-[var(--text-muted)]">
            We couldn't find a city matching "{citySlug}".
          </p>
          <a
            href="/find"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all cities
          </a>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  const seoTitle = `Art in ${city.name}, ${city.state} — Artwalls | Find Local Venues & Artwork`;
  const seoDesc = `Discover venues hosting original local artwork in ${city.name}, ${city.state}. Browse the map, find art near you, and support local artists.`;
  const canonicalUrl = `https://artwalls.space/find/${toCitySlug(city.name)}`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      <SEO
        title={seoTitle}
        description={seoDesc}
        ogTitle={seoTitle}
        ogDescription={seoDesc}
        ogUrl={canonicalUrl}
        canonical={canonicalUrl}
      />

      {/* Toolbar */}
      <div className="bg-[var(--surface-1)] border-b border-[var(--border)] px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          {/* Left: back + city name */}
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/find"
              className="shrink-0 p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              aria-label="Back to city list"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate font-display tracking-tight">
                {city.name}, {city.state}
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {loading
                  ? 'Loading venues…'
                  : `${venues.length} venue${venues.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>

          {/* Right: search + mobile toggle */}
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter venues…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg w-48 outline-none
                           bg-[var(--bg)] text-[var(--text)] border border-[var(--border)]
                           placeholder:text-[var(--text-muted)]/60
                           focus:ring-2 focus:ring-[var(--blue)]"
              />
            </div>

            {/* Mobile map/list toggle */}
            <div className="flex sm:hidden rounded-lg overflow-hidden border border-[var(--border)]" role="radiogroup" aria-label="View mode">
              <button
                type="button"
                role="radio"
                aria-checked={mobileView === 'map'}
                onClick={() => setMobileView('map')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  mobileView === 'map'
                    ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mobileView === 'list'}
                onClick={() => setMobileView('list')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                  mobileView === 'list'
                    ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                }`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 py-2">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2 overflow-x-auto">
          {([
            { key: 'all', label: 'All venues' },
            { key: 'accepting', label: 'Accepting submissions', icon: Megaphone },
            { key: 'new', label: 'New this week', icon: Sparkles },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterChip(filterChip === key ? 'all' : key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filterChip === key
                  ? 'bg-[var(--blue)] text-[var(--on-blue)] border-[var(--blue)]'
                  : 'bg-[var(--surface-1)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
          <a
            href="/calls"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <Megaphone className="w-3 h-3" />
            Browse all calls
          </a>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Map panel */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden sm:block' : ''
          } sm:flex-[3] h-[50vh] sm:h-auto`}
        >
          <Suspense fallback={<MapSkeleton />}>
            <VenueMap
              venues={filteredVenues}
              centerLat={city.lat}
              centerLng={city.lng}
              zoom={12}
              selectedVenueId={selectedVenueId}
              onVenueClick={(v) => {
                setSelectedVenueId(v.id);
                setMobileView('list');
              }}
            />
          </Suspense>
        </div>

        {/* List panel */}
        <div
          className={`${
            mobileView === 'map' ? 'hidden sm:flex' : 'flex'
          } sm:flex-[2] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg)]`}
        >
          {/* Mobile search (visible only on small screens) */}
          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter venues…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg outline-none
                           bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)]
                           placeholder:text-[var(--text-muted)]/60
                           focus:ring-2 focus:ring-[var(--blue)]"
              />
            </div>
          </div>

          {/* Scrollable venue list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <>
                <VenueMapCardSkeleton />
                <VenueMapCardSkeleton />
                <VenueMapCardSkeleton />
                <VenueMapCardSkeleton />
              </>
            ) : filteredVenues.length === 0 ? (
              <EmptyState city={city} nearbyCities={nearbyCities} onCityClick={handleCitySwitch} />
            ) : (
              filteredVenues.map((v) => (
                <VenueMapCard
                  key={v.id}
                  venue={v}
                  isSelected={v.id === selectedVenueId}
                  onSelect={(venue) => setSelectedVenueId(venue.id)}
                  onViewProfile={handleViewProfile}
                />
              ))
            )}
          </div>

          {/* Nearby cities */}
          {nearbyCities.length > 0 && !loading && (
            <div className="border-t border-[var(--border)] px-3 py-3 shrink-0">
              <p className="text-xs font-medium mb-2 text-[var(--text-muted)]">
                Nearby cities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nearbyCities.map((c) => (
                  <button
                    key={`${c.name}-${c.state}`}
                    type="button"
                    onClick={() => handleCitySwitch(c)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--blue)]"
                  >
                    {c.name}, {c.state}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MapSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center animate-pulse bg-[var(--surface-2)]">
      <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
    </div>
  );
}

function EmptyState({
  city,
  nearbyCities,
  onCityClick,
}: {
  city: City;
  nearbyCities: City[];
  onCityClick: (c: City) => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <Store className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
      <h3 className="text-base font-semibold mb-1">
        No venues in {city.name} yet
      </h3>
      <p className="text-xs mb-6 text-[var(--text-muted)]">
        Venues are joining Artwalls every week. Check back soon or try a nearby city.
      </p>
      {nearbyCities.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {nearbyCities.slice(0, 4).map((c) => (
            <button
              key={`${c.name}-${c.state}`}
              type="button"
              onClick={() => onCityClick(c)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--blue)]"
            >
              {c.name}, {c.state}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
