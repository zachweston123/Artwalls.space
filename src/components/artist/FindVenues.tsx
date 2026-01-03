import { useState } from 'react';
import { Search, MapPin, Filter, Frame, CheckCircle } from 'lucide-react';
import { LabelChip } from '../LabelChip';

interface FindVenuesProps {
  onViewVenue: (venueId: string) => void;
  onViewWallspaces: (venueId: string) => void;
}

export function FindVenues({ onViewVenue, onViewWallspaces }: FindVenuesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    labels: [] as string[],
    acceptingArtists: false,
    neighborhood: '',
    venueType: '',
  });

  const venueLabels = [
    'Locally owned', 'LGBTQ+ friendly', 'Women-owned', 'Black-owned',
    'Veteran-owned', 'Student-friendly', 'Family-friendly', 'Dog-friendly'
  ];

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

  // Mock venues data
  const mockVenues = [
    {
      id: '1',
      name: 'Brew & Palette Café',
      type: 'Coffee Shop',
      coverPhoto: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
      location: 'Pearl District, Portland',
      bio: 'Cozy neighborhood café supporting local artists for 8+ years. Warm atmosphere, exceptional coffee.',
      labels: ['Locally owned', 'LGBTQ+ friendly', 'Dog-friendly'],
      foundedYear: 2016,
      wallSpaces: 4,
      availableSpaces: 2,
      verified: true,
    },
    {
      id: '2',
      name: 'The Artisan Lounge',
      type: 'Restaurant',
      coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      location: 'Downtown, Portland',
      bio: 'Upscale restaurant and bar featuring rotating local art. High-traffic location, professional clientele.',
      labels: ['Locally owned', 'Family-friendly', 'Wheelchair accessible'],
      foundedYear: 2012,
      wallSpaces: 6,
      availableSpaces: 1,
      verified: true,
    },
    {
      id: '3',
      name: 'Revolution Coffee House',
      type: 'Coffee Shop',
      coverPhoto: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      location: 'Alberta Arts, Portland',
      bio: 'Community-focused coffee shop in the heart of the arts district. Supporting emerging artists since 2018.',
      labels: ['Women-owned', 'Student-friendly', 'Live music venue'],
      foundedYear: 2018,
      wallSpaces: 3,
      availableSpaces: 3,
      verified: false,
    },
    {
      id: '4',
      name: 'Nomad Wine & Spirits',
      type: 'Wine Bar',
      coverPhoto: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      location: 'Hawthorne, Portland',
      bio: 'Contemporary wine bar showcasing bold, modern artwork. Sophisticated space for adventurous pieces.',
      labels: ['Locally owned', 'LGBTQ+ friendly', 'Late night hours'],
      foundedYear: 2019,
      wallSpaces: 2,
      availableSpaces: 0,
      verified: true,
    },
  ];

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
  const filteredVenues = mockVenues.filter(venue => {
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
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
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
