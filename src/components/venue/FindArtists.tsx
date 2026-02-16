import { useEffect, useState } from 'react';
import { Search, MapPin, Filter, Users } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { apiGet } from '../../lib/api';
import { PageHeroHeader } from '../PageHeroHeader';
import { EmptyState } from '../EmptyState';

interface FindArtistsProps {
  onInviteArtist: (artistId: string) => void;
  onViewProfile: (artistId: string) => void;
  onNavigate?: (page: string) => void;
}

export function FindArtists({ onInviteArtist, onViewProfile, onNavigate }: FindArtistsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    artTypes: [] as string[],
    openToNew: false,
  });

  const artTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor'
  ];

  const toggleArtType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      artTypes: prev.artTypes.includes(type)
        ? prev.artTypes.filter(t => t !== type)
        : [...prev.artTypes, type]
    }));
  };

  const clearFilters = () => {
    setFilters({
      artTypes: [],
      openToNew: false,
    });
    setSearchQuery('');
  };

  const [artists, setArtists] = useState<any[]>([]);
  const [venueCity, setVenueCity] = useState<string>('');

  // Debounce search
  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(async () => {
      await loadArtists();
    }, 500);

    async function loadArtists() {
      try {
        // Load venue profile to determine local city (only once if not loaded)
        let city = venueCity;
        if (!city && !venueCity) {
          const me = await apiGet<{ role: string; profile: { id: string; city?: string | null } }>('/api/profile/me');
          city = (me?.profile?.city || '').trim();
          if (isMounted) setVenueCity(city);
        }

        let path = '/api/artists';
        const params = new URLSearchParams();
        if (city) params.append('city', city);
        if (searchQuery.trim()) params.append('q', searchQuery.trim());

        if (Array.from(params).length > 0) {
          path += `?${params.toString()}`;
        }

        const resp = await apiGet<{ artists: Array<{ id: string; name?: string | null; email?: string | null; profile_photo_url?: string | null; location?: string }> }>(
          path
        );
        const apiArtists = resp?.artists || [];
        const shaped = apiArtists.map((a) => ({
          id: a.id,
          name: a.name || 'Artist',
          avatar: a.profile_photo_url || undefined,
          location: a.location || city || 'Local',
          bio: 'Artist on Artwalls',
          artTypes: ['Painter'],
          openToNew: true,
          portfolioCount: 0,
        }));
        if (isMounted) setArtists(shaped);
      } catch {
        if (isMounted) setArtists([]);
      }
    }

    // Initial load is covered by debounce
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]); // Re-run when searchQuery changes

  const hasActiveFilters = filters.artTypes.length > 0 || filters.openToNew || searchQuery;

  // Filter artists based on criteria
  const filteredArtists = (artists.length ? artists : []).filter(artist => {
    // Search is now handled by backend, but we keep client filter for immediate feedback if list is already loaded.
    if (searchQuery && !artist.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      // Trust backend results for search query
      return true;
    }
    if (filters.openToNew && !artist.openToNew) {
      return false;
    }
    if (filters.artTypes.length > 0) {
      const hasMatchingType = filters.artTypes.some(type => artist.artTypes.includes(type));
      if (!hasMatchingType) return false;
    }
    return true;
  });

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        breadcrumb="Discover / Find Artists"
        title="Find artists"
        subtitle={`Discover ${venueCity ? `${venueCity} ` : ''}artists and invite them to display at your venue.`}
        actions={
          onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('venue-profile')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]"
            >
              Improve venue profile
            </button>
          ) : undefined
        }
      />

      {/* Search & Filters */}
      <div className="bg-[var(--surface-1)] rounded-xl p-4 sm:p-6 border border-[var(--border)] mb-6">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by artist name..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 sm:px-6 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'border-[var(--green)] bg-[var(--green-muted)] text-[var(--green)]'
                : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:border-[var(--green)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className={hasActiveFilters ? 'inline' : 'hidden sm:inline'}>Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--green)] text-[var(--accent-contrast)] text-xs rounded-full min-w-[20px] text-center">
                {(filters.artTypes.length + (filters.openToNew ? 1 : 0))}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            {/* Art Types */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">
                Art Types
              </label>
              <div className="flex flex-wrap gap-2">
                {artTypes.map((type) => (
                  <LabelChip
                    key={type}
                    label={type}
                    selected={filters.artTypes.includes(type)}
                    onClick={() => toggleArtType(type)}
                    role="venue"
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* Open to Placements Toggle */}
            <div className="flex items-center justify-between p-3 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
              <label className="text-sm text-[var(--text)]">
                Only show artists open to new placements
              </label>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, openToNew: !filters.openToNew })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filters.openToNew
                    ? 'bg-[var(--green)]'
                    : 'bg-[var(--border)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[var(--surface-1)] transition-transform ${
                    filters.openToNew ? 'translate-x-6' : 'translate-x-1'
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
          Showing artists in {venueCity || 'your area'} · {filteredArtists.length} results
        </p>
      </div>

      {/* Artists Grid */}
      {filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] hover:shadow-lg transition-all"
            >
              <div className="flex gap-4 mb-4">
                {/* Avatar */}
                <button
                  onClick={() => onViewProfile(artist.id)}
                  className="flex-shrink-0 group"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--surface-2)] border-2 border-[var(--border)] group-hover:border-[var(--green)] transition-colors">
                    {artist.avatar ? (
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--surface-3)] text-[var(--text-muted)] text-2xl font-bold">
                        {artist.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onViewProfile(artist.id)}
                    className="text-left group"
                  >
                    <h3 className="text-xl mb-1 group-hover:text-[var(--green)] transition-colors">
                      {artist.name}
                    </h3>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                    <MapPin className="w-3 h-3" />
                    {artist.location}
                  </div>
                  {artist.openToNew && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full text-xs">
                      <div className="w-1.5 h-1.5 bg-[var(--green)] rounded-full"></div>
                      Open to new placements
                    </div>
                  )}
                </div>
              </div>

              {/* Art Types */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {artist.artTypes.slice(0, 3).map((type) => (
                  <LabelChip
                    key={type}
                    label={type}
                    selected
                    role="venue"
                    size="sm"
                  />
                ))}
                {artist.artTypes.length > 3 && (
                  <span className="text-xs text-[var(--text-muted)] px-2 py-1">
                    +{artist.artTypes.length - 3} more
                  </span>
                )}
              </div>

              {/* Bio Snippet */}
              <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
                {artist.bio}
              </p>

              {/* Portfolio Count */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
                <Users className="w-3 h-3" />
                {artist.portfolioCount} artworks in portfolio
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => onViewProfile(artist.id)}
                  className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors text-sm"
                >
                  View Profile
                </button>
                <button
                  onClick={() => onInviteArtist(artist.id)}
                  className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  Invite to Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No artists found"
          description={hasActiveFilters ? 'Try adjusting filters to see more artists.' : 'Check back soon as new artists join the platform.'}
          primaryAction={{ label: 'Adjust filters', onClick: () => setShowFilters(true) }}
          secondaryAction={onNavigate ? { label: 'Improve venue profile', onClick: () => onNavigate('venue-profile') } : undefined}
        />
      )}
    </div>
  );
}
