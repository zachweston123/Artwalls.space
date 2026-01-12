import { useState } from 'react';
import { Search, MapPin, Filter, Grid, List } from 'lucide-react';

interface FindArtHubProps {
  onNavigate?: (page: string, venueId?: string) => void;
}

export function FindArtHub({ onNavigate }: FindArtHubProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const venues = [
    {
      id: '1',
      slug: 'modern-gallery',
      name: 'Modern Gallery Space',
      city: 'San Francisco',
      category: 'Contemporary',
      description: 'Contemporary art gallery featuring emerging artists',
      image: 'https://images.unsplash.com/photo-1578962996442-48f60103fc96?w=400&h=300&fit=crop',
      isFeatured: true,
    },
    {
      id: '2',
      slug: 'urban-artworks',
      name: 'Urban Artworks',
      city: 'Los Angeles',
      category: 'Street Art',
      description: 'Dedicated to street art and urban culture',
      image: 'https://images.unsplash.com/photo-1577720643272-265e434b8e4b?w=400&h=300&fit=crop',
      isFeatured: false,
    },
  ];

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          venue.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !selectedCity || venue.city === selectedCity;
    const matchesCategory = !selectedCategory || venue.category === selectedCategory;
    return matchesSearch && matchesCity && matchesCategory;
  });

  const cities = Array.from(new Set(venues.map(v => v.city)));
  const categories = Array.from(new Set(venues.map(v => v.category)));

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
              <div key={venue.id} className="bg-[var(--surface)] rounded-lg overflow-hidden">
                <img src={venue.image} alt={venue.name} className="w-full h-40 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text)]">{venue.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{venue.city}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVenues.map(venue => (
              <div key={venue.id} className="bg-[var(--surface)] rounded-lg p-4 flex gap-4">
                <img src={venue.image} alt={venue.name} className="w-32 h-32 object-cover rounded-lg" />
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{venue.name}</h3>
                  <p className="text-[var(--text-muted)]">{venue.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
