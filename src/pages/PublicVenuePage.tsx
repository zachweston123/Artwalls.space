import { useMemo } from 'react';
import { VenueProfileView } from '../components/venue/VenueProfileView';
import type { User } from '../App';

interface PublicVenuePageProps {
  venueId: string;
}

export function PublicVenuePage({ venueId }: PublicVenuePageProps) {
  const visitorUser: User = useMemo(
    () => ({ id: 'visitor', name: 'Visitor', email: '', role: 'artist' }),
    []
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <VenueProfileView
          isOwnProfile={false}
          venueId={venueId}
          currentUser={visitorUser}
        />
      </div>
    </div>
  );
}
