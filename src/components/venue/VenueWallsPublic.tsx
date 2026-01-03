import { useEffect, useState } from 'react';
import { Frame, MapPin } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { mockVenues } from '../../data/mockData';

interface VenueWallsPublicProps {
  venueId?: string;
  onBack?: () => void;
}

type WallSpace = {
  id: string;
  name: string;
  width?: number;
  height?: number;
  available: boolean;
  description?: string;
  photos?: string[];
};

export function VenueWallsPublic({ venueId, onBack }: VenueWallsPublicProps) {
  const venue = venueId ? mockVenues.find(v => v.id === venueId) : null;
  const [walls, setWalls] = useState<WallSpace[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!venueId) return;
      try {
        const items = await apiGet<WallSpace[]>(`/api/venues/${venueId}/wallspaces`);
        if (isMounted) setWalls(items);
      } catch {
        setWalls([]);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [venueId]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">{venue ? venue.name : 'Venue'} Wall Spaces</h1>
          {venue && (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{venue.address}</span>
            </div>
          )}
          {!venue && (
            <p className="text-[var(--text-muted)]">Browse available wall spaces</p>
          )}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {walls.map((wall) => (
          <div
            key={wall.id}
            className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow"
          >
            {/* Photo */}
            {wall.photos && wall.photos.length > 0 && (
              <div className="h-48 bg-[var(--surface-2)] overflow-hidden">
                <img src={wall.photos[0]} alt={wall.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--surface-3)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Frame className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1">{wall.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{wall.width}" × {wall.height}"</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    wall.available ? 'bg-[var(--green-muted)] text-[var(--green)]' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                  }`}
                >
                  {wall.available ? 'Available' : 'Occupied'}
                </span>
              </div>

              {wall.description && (
                <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{wall.description}</p>
              )}

              {/* Read-only view for artists; no edit controls */}
              <div className="text-sm text-[var(--text-muted)]">
                {wall.available ? 'This space is open for applications.' : 'This space currently has an artwork on display.'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {walls.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Frame className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No wall spaces listed</h3>
          <p className="text-[var(--text-muted)]">Check back later as the venue adds spaces.</p>
        </div>
      )}
    </div>
  );
}
