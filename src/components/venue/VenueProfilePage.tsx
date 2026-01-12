import { useState } from 'react';
import { Share2, Download, MapPin, Clock, Globe, Instagram } from 'lucide-react';

interface VenueProfilePageProps {
  venueSlug?: string;
  onNavigate?: (page: string) => void;
}

export function VenueProfilePage({ venueSlug, onNavigate }: VenueProfilePageProps) {
  const [showShareKit, setShowShareKit] = useState(false);

  const venue = {
    id: '1',
    slug: venueSlug || 'sample-venue',
    name: 'Modern Gallery Space',
    description: 'Contemporary art gallery featuring emerging and established artists.',
    hero_image_url: 'https://images.unsplash.com/photo-1578962996442-48f60103fc96?w=1200&h=400&fit=crop',
    gallery_images: [
      'https://images.unsplash.com/photo-1578962996442-48f60103fc96?w=400&h=300&fit=crop',
    ],
    address: '123 Main Street',
    city: 'San Francisco',
    website_url: 'https://example.com',
    instagram_handle: '@moderngallery',
    venue_categories: ['Contemporary', 'Emerging Artists'],
    neighborhood: 'Mission District',
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="relative h-96 overflow-hidden">
        <img src={venue.hero_image_url} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        <div className="bg-[var(--surface)] rounded-xl shadow-lg p-6 sm:p-8">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">{venue.name}</h1>
          <p className="text-[var(--text-muted)] mb-8">{venue.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-[var(--border)]">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-[var(--text-muted)]">Location</p>
                <p className="text-[var(--text)]">{venue.address}, {venue.city}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Globe className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-[var(--text-muted)]">Website</p>
                <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Visit</a>
              </div>
            </div>
          </div>

          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-6">
            <h3 className="font-semibold text-[var(--text)] mb-2">Host Art With Artwalls</h3>
            <p className="text-[var(--text-muted)] text-sm">Earn 15% from every sale.</p>
            <button onClick={() => onNavigate?.('venues-partner-kit')} className="mt-4 px-4 py-2 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity font-medium">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  );
}
