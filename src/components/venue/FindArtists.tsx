import { useEffect, useState } from 'react';
import { Search, MapPin, Filter, Users } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { apiGet } from '../../lib/api';

interface FindArtistsProps {
  onInviteArtist: (artistId: string) => void;
  onViewProfile: (artistId: string) => void;
}

export function FindArtists({ onInviteArtist, onViewProfile }: FindArtistsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    artTypes: [] as string[],
    openToNew: false,
    neighborhood: '',
  });

  const artTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor'
  ];

  const neighborhoods = [
    'Downtown', 'Pearl District', 'Alberta Arts', 'Hawthorne',
    'Division', 'Sellwood', 'St. Johns', 'Hollywood'
  ];

  // Live artists data

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
      neighborhood: '',
    });
    setSearchQuery('');
  };

  const [artists, setArtists] = useState<any[]>([]);
  const [venueCity, setVenueCity] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadArtists() {
      try {
        // Load venue profile to determine local city
        const me = await apiGet<{ role: string; profile: { id: string; city?: string | null } }>(
          '/api/profile/me'
        );
        const city = (me?.profile?.city || '').trim();
        if (isMounted) setVenueCity(city);
        const path = city ? `/api/artists?city=${encodeURIComponent(city)}` : '/api/artists';
        const resp = await apiGet<{ artists: Array<{ id: string; name?: string | null; email?: string | null }> }>(
          path
        );
        const apiArtists = resp?.artists || [];
        const shaped = apiArtists.map((a) => ({
          id: a.id,
          name: a.name || 'Artist',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
          location: city || 'Local',
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

    loadArtists();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasActiveFilters = filters.artTypes.length > 0 || filters.openToNew || filters.neighborhood || searchQuery;

  // Filter artists based on criteria
  const filteredArtists = (artists.length ? artists : []).filter(artist => {
    if (searchQuery && !artist.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.neighborhood && !artist.location.includes(filters.neighborhood)) {
      return false;
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Find Artists</h1>
        <p className="text-[var(--text-muted)]">
          Discover {venueCity ? `${venueCity} ` : ''}artists and invite them to display at your venue
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
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
            className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'border-[var(--green)] bg-[var(--green-muted)] text-[var(--green)]'
                : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] hover:border-[var(--green)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-[var(--green)] text-[var(--accent-contrast)] text-xs rounded-full">
                {(filters.artTypes.length + (filters.openToNew ? 1 : 0) + (filters.neighborhood ? 1 : 0))}
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
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                <option value="">All neighborhoods</option>
                {neighborhoods.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </select>
            </div>

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
          <span className="text-[var(--text)]">{filteredArtists.length}</span> artists found
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
                    <img
                      src={artist.avatar}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
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
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No artists found</h3>
          <p className="text-[var(--text-muted)] mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'Check back soon as new artists join the platform'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
