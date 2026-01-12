import { useState } from 'react';
import { Search, MapPin, Filter, Grid, List } from 'lucide-react';

interface FindArtHubProps {
  onNavigate?: (page: string, params?: any) => void;
}

export function FindArtHub({ onNavigate }: FindArtHubProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const venues = [
    {
      id: '1',
      name: 'Modern Gallery Space',
      city: 'San Francisco',
      category: 'Contemporary',
      image: 'https://images.unsplash.com/photo-1578962996442-48f60103fc96?w=400&h=300&fit=crop',
      featured: true,
    },
    {
      id: '2',
      name: 'Urban Artworks',
      city: 'Los Angeles',
      category: 'Street Art',
      image: 'https://images.unsplash.com/photo-1577720643272-265e434b8e4b?w=400&h=300&fit=crop',
      featured: false,
    },
  ];

  const cities = Array.from(new Set(venues.map(v => v.city)));
  const categories = Array.from(new Set(venues.map(v => v.category)));

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          venue.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !selectedCity || venue.city === selectedCity;
    const matchesCategory = !selectedCategory || venue.category === selectedCategory;
    return matchesSearch && matchesCity && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 px-4 sm:px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-[var(--accent-contrast)] mb-4">Find Art Venues</h1>
          <p className="text-[var(--accent-contrast)]/90 mb-8">Discover galleries and spaces hosting emerging artists</p>

          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by venue or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--surface)] text-[var(--text)] rounded-lg border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text)] mb-2">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--surface)] text-[var(--text)] rounded-lg border border-[var(--border)]"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--accent)]' : 'bg-[var(--surface)]'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--accent)]' : 'bg-[var(--surface)]'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map(venue => (
              <div
                key={venue.id}
                className="group cursor-pointer bg-[var(--surface)] rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow"
                onClick={() => onNavigate?.('venue-profile', { venueId: venue.id })}
              >
                <div className="relative h-48 overflow-hidden bg-[var(--surface-2)]">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {venue.featured && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold rounded-full">
                      Featured
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text)] mb-1">{venue.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mb-2">
                    <MapPin className="w-4 h-4" />
                    {venue.city}
                  </div>
                  <span className="inline-block px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] text-xs rounded">
                    {venue.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVenues.map(venue => (
              <div
                key={venue.id}
                className="flex gap-4 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigate?.('venue-profile', { venueId: venue.id })}
              >
                <img
                  src={venue.image}
                  alt={venue.name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--text)]">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-[var(--text-muted)] mt-1">
                        <MapPin className="w-4 h-4" />
                        {venue.city}
                      </div>
                    </div>
                    {venue.featured && (
                      <span className="px-2 py-1 bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold rounded">
                        Featured
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-2 px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] text-xs rounded">
                    {venue.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredVenues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No venues found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}