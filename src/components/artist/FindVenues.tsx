import { useEffect, useState } from 'react';
import { Search, MapPin, Filter, Frame, CheckCircle, Crown } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { VENUE_HIGHLIGHTS } from '../../data/highlights';
import { apiGet } from '../../lib/api';

interface FindVenuesProps {
  onViewVenue: (venueId: string) => void;
  onViewWallspaces: (venueId: string) => void;
}

type SubscriptionTier = 'free' | 'starter' | 'growth' | 'pro';

export function FindVenues({ onViewVenue, onViewWallspaces }: FindVenuesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [filters, setFilters] = useState({
    labels: [] as string[],
    acceptingArtists: false,
    neighborhood: '',
    venueType: '',
  });

  const venueLabels = VENUE_HIGHLIGHTS;

  const neighborhoods = [
    'Downtown', 'Pearl District', 'Alberta Arts', 'Hawthorne',
    'Division', 'Sellwood', 'St. Johns', 'Hollywood'
  ];

  const venueTypes = [
    'Coffee Shop',
    'Restaurant',
    'Wine Bar',
    'Bar',
    'Hotel',
    'Gallery',
    'Retail',
    'Office',
    'Other',
  ];

  // Mock venue details (used as a UI fallback / enrichment layer)
  const mockVenues: any[] = [];
  const [artistCities, setArtistCities] = useState<{ primary: string; secondary: string }>({ primary: '', secondary: '' });

  useEffect(() => {
    let isMounted = true;

    async function loadVenues() {
      try {
        // Load user tier for priority visibility
        const me = await apiGet<{ profile?: { subscription_tier?: string } }>('/api/me');
        if (isMounted) {
          const tier = (me?.profile?.subscription_tier || 'free').toLowerCase() as SubscriptionTier;
          setUserTier(tier);
        }

        // Load artist profile to get their cities
        const meProfile = await apiGet<{ role: string; profile: { city_primary?: string | null; city_secondary?: string | null } }>(
          '/api/profile/me'
        );
        const primary = (meProfile?.profile?.city_primary || '').trim();
        const secondary = (meProfile?.profile?.city_secondary || '').trim();
        if (isMounted) setArtistCities({ primary, secondary });

        // Build query params for city-based filtering
        const params = new URLSearchParams();
        if (primary) params.append('artistPrimaryCity', primary);
        if (secondary) params.append('artistSecondaryCity', secondary);

        const path = params.toString() ? `/api/venues?${params.toString()}` : '/api/venues';
        
        const apiVenues = await apiGet<Array<{ id: string; name?: string | null; email?: string | null; type?: string | null }>>(
          path
        );

          const merged = (apiVenues || []).map((v) => {
          const fallback = mockVenues.find((m) => m.name === v.name) || null;

          // Preserve the existing UI shape, but prefer API values when present.
            return {
            id: v.id,
            name: v.name || fallback?.name || 'Venue',
            type: v.type || fallback?.type || 'Other',
            coverPhoto:
              fallback?.coverPhoto ||
              'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
            location: fallback?.location || '',
            bio: fallback?.bio || '',
              labels: (v as any).labels || fallback?.labels || [],
            foundedYear: fallback?.foundedYear || new Date().getFullYear(),
            wallSpaces: fallback?.wallSpaces || 0,
            availableSpaces: fallback?.availableSpaces || 0,
            verified: fallback?.verified || false,
          };
        });

        // If API has no venues yet (fresh DB), keep the current mock list so the page isn't empty.
        const next = merged.length > 0 ? merged : mockVenues;
        if (isMounted) setVenues(next);
      } catch {
        if (isMounted) setVenues(mockVenues);
      }
    }

    loadVenues();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLabel = (label: string) => {
    setFilters(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label]
    }));
  };

  const clearFilters = () => {
    setFilters({
      labels: [],
      acceptingArtists: false,
      neighborhood: '',
      venueType: '',
    });
    setSearchQuery('');
  };

  const hasActiveFilters =
    filters.labels.length > 0 ||
    filters.acceptingArtists ||
    filters.neighborhood ||
    filters.venueType ||
    searchQuery;

  // Filter venues based on criteria
  const filteredVenues = (venues.length ? venues : mockVenues).filter(venue => {
    if (searchQuery && !venue.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.neighborhood && !venue.location.includes(filters.neighborhood)) {
      return false;
    }
    if (filters.venueType && venue.type !== filters.venueType) {
      return false;
    }
    if (filters.acceptingArtists && venue.availableSpaces === 0) {
      return false;
    }
    if (filters.labels.length > 0) {
      const hasMatchingLabel = filters.labels.some(label => venue.labels.includes(label));
      if (!hasMatchingLabel) return false;
    }
    return true;
  }).sort((a, b) => {
    // Tier-based priority sorting: Higher tiers get better visibility
    const priorityOrder: Record<SubscriptionTier, number> = {
      'free': 0,
      'starter': 1,
      'growth': 2,
      'pro': 3,
    };
    
    const aPriority = priorityOrder[userTier] || 0;
    
    // Growth+ users see featured venues first
    if (aPriority >= 2) {
      // Sort by verified status first, then alphabetically
      if (a.verified !== b.verified) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
    }
    
    // For search results, prioritize name match relevance
    if (searchQuery) {
      const aMatch = a.name.toLowerCase().startsWith(searchQuery.toLowerCase());
      const bMatch = b.name.toLowerCase().startsWith(searchQuery.toLowerCase());
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
    }
    
    // Default sort: by available spaces (more availability = better visibility)
    return b.availableSpaces - a.availableSpaces;
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Find Venues</h1>
        <p className="text-[var(--text-muted)]">
          Discover venues where you can display and sell your artwork
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by venue name..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'border-[var(--blue)] bg-[var(--surface-2)] text-[var(--blue)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--blue)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--blue)] text-[var(--on-blue)] text-xs rounded-full">
                {(filters.labels.length + (filters.acceptingArtists ? 1 : 0) + (filters.neighborhood ? 1 : 0) + (filters.venueType ? 1 : 0))}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            {/* Neighborhood */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">
                Neighborhood
              </label>
              <select
                value={filters.neighborhood}
                onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                <option value="">All neighborhoods</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue Type */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">
                Venue Type
              </label>
              <select
                value={filters.venueType}
                onChange={(e) => setFilters({ ...filters, venueType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                <option value="">All venue types</option>
                {venueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Venue Labels */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">
                Venue Highlights
              </label>
              <div className="flex flex-wrap gap-2">
                {venueLabels.map((label) => (
                  <LabelChip
                    key={label}
                    label={label}
                    selected={filters.labels.includes(label)}
                    onClick={() => toggleLabel(label)}
                    role="artist"
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* Accepting Artists Toggle */}
            <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--blue)]">
              <label className="text-sm text-[var(--text)]">
                Only show venues with available wall spaces
              </label>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, acceptingArtists: !filters.acceptingArtists })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filters.acceptingArtists
                    ? 'bg-[var(--blue)]'
                    : 'bg-[var(--border)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[var(--surface-1)] transition-transform ${
                    filters.acceptingArtists ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[var(--text-muted)]">
          <span className="text-[var(--text)]">{filteredVenues.length}</span> venues found
        </p>
      </div>

      {/* Venues Grid */}
      {filteredVenues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-all group"
            >
              {/* Cover Photo */}
              <button
                onClick={() => onViewVenue(venue.id)}
                className="w-full"
              >
                <div className="h-48 bg-[var(--surface-3)] overflow-hidden">
                  <img
                    src={venue.coverPhoto}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </button>

              <div className="p-6">
                {/* Header */}
                <div className="mb-3">
                  <button
                    onClick={() => onViewVenue(venue.id)}
                    className="text-left w-full group/name"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl group-hover/name:text-[var(--blue)] transition-colors">
                        {venue.name}
                      </h3>
                      {venue.verified && (
                        <CheckCircle className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
                      )}
                      {(['growth', 'pro'] as SubscriptionTier[]).includes(userTier) && venue.verified && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--accent)] bg-opacity-20 rounded-full">
                          <Crown className="w-3 h-3 text-[var(--accent)]" />
                          <span className="text-xs font-semibold text-[var(--accent)]">Featured</span>
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <MapPin className="w-3 h-3" />
                    {venue.location}
                  </div>
                  {venue.type && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {venue.type}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Established {venue.foundedYear} • {currentYear - venue.foundedYear} years
                  </p>
                </div>

                {/* Labels */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {venue.labels.slice(0, 3).map((label) => (
                    <LabelChip
                      key={label}
                      label={label}
                      selected
                      role="artist"
                      size="sm"
                    />
                  ))}
                  {venue.labels.length > 3 && (
                    <span className="text-xs text-[var(--text-muted)] px-2 py-1">
                      +{venue.labels.length - 3} more
                    </span>
                  )}
                </div>

                {/* Bio */}
                <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
                  {venue.bio}
                </p>

                {/* Wall Spaces Info */}
                <div className="flex items-center justify-between text-xs mb-4 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Frame className="w-3 h-3" />
                    {venue.wallSpaces} wall spaces
                  </div>
                  {venue.availableSpaces > 0 ? (
                    <span className="px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full">
                      {venue.availableSpaces} available
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">
                      Currently full
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => onViewVenue(venue.id)}
                    className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors text-sm"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => onViewWallspaces(venue.id)}
                    className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm"
                  >
                    View Wallspaces
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Frame className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No venues found</h3>
          <p className="text-[var(--text-muted)] mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'Check back soon as new venues join the platform'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
