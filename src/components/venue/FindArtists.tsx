import { useState } from 'react';
import { Search, MapPin, Filter, Users } from 'lucide-react';
import { LabelChip } from '../LabelChip';

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

  // Mock artists data
  const mockArtists = [
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      location: 'Downtown, Portland',
      bio: 'Contemporary mixed media artist exploring urban life and human connection through layered, textured pieces.',
      artTypes: ['Painter', 'Mixed Media', 'Digital'],
      openToNew: true,
      portfolioCount: 24,
    },
    {
      id: '2',
      name: 'Marcus Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      location: 'Pearl District, Portland',
      bio: 'Street photographer capturing the raw energy of urban spaces. Bold compositions and dramatic lighting.',
      artTypes: ['Photographer', 'Digital'],
      openToNew: true,
      portfolioCount: 47,
    },
    {
      id: '3',
      name: 'Emma Liu',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      location: 'Alberta Arts, Portland',
      bio: 'Traditional painter working in oils. Landscapes and botanical studies with contemporary sensibilities.',
      artTypes: ['Painter', 'Illustrator'],
      openToNew: false,
      portfolioCount: 31,
    },
    {
      id: '4',
      name: 'Jordan Taylor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      location: 'Hawthorne, Portland',
      bio: 'Printmaker and collage artist. I create bold, graphic works inspired by nature and pop culture.',
      artTypes: ['Printmaker', 'Collage', 'Mixed Media'],
      openToNew: true,
      portfolioCount: 19,
    },
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
      neighborhood: '',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.artTypes.length > 0 || filters.openToNew || filters.neighborhood || searchQuery;

  // Filter artists based on criteria
  const filteredArtists = mockArtists.filter(artist => {
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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Find Artists</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          Discover local artists and invite them to display at your venue
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by artist name..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-green-300 dark:hover:border-green-500'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-green-600 dark:bg-green-500 text-white text-xs rounded-full">
                {(filters.artTypes.length + (filters.openToNew ? 1 : 0) + (filters.neighborhood ? 1 : 0))}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
            {/* Neighborhood */}
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                Neighborhood
              </label>
              <select
                value={filters.neighborhood}
                onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
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
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-2">
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
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
              <label className="text-sm text-neutral-900 dark:text-neutral-50">
                Only show artists open to new placements
              </label>
              <button
                type="button"
                onClick={() => setFilters({ ...filters, openToNew: !filters.openToNew })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filters.openToNew
                    ? 'bg-green-600 dark:bg-green-500'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    filters.openToNew ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="text-neutral-900 dark:text-neutral-50">{filteredArtists.length}</span> artists found
        </p>
      </div>

      {/* Artists Grid */}
      {filteredArtists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all"
            >
              <div className="flex gap-4 mb-4">
                {/* Avatar */}
                <button
                  onClick={() => onViewProfile(artist.id)}
                  className="flex-shrink-0 group"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 group-hover:border-green-500 dark:group-hover:border-green-400 transition-colors">
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
                    <h3 className="text-xl mb-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {artist.name}
                    </h3>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    <MapPin className="w-3 h-3" />
                    {artist.location}
                  </div>
                  {artist.openToNew && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1">
                    +{artist.artTypes.length - 3} more
                  </span>
                )}
              </div>

              {/* Bio Snippet */}
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-2">
                {artist.bio}
              </p>

              {/* Portfolio Count */}
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                <Users className="w-3 h-3" />
                {artist.portfolioCount} artworks in portfolio
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => onViewProfile(artist.id)}
                  className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm"
                >
                  View Profile
                </button>
                <button
                  onClick={() => onInviteArtist(artist.id)}
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors text-sm"
                >
                  Invite to Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No artists found</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'Check back soon as new artists join the platform'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
