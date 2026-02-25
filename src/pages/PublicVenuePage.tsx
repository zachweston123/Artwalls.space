/**
 * PublicVenuePage – /venues/:venueId
 *
 * Standalone, read-only public venue profile.
 * Matches the branding structure of PublicArtistProfilePage.
 */

import { useEffect, useState, useMemo } from 'react';
import { Loader2, Store } from 'lucide-react';
import { VenueProfileView } from '../components/venue/VenueProfileView';
import { VenueProfilePublicView, type VenuePublicData } from '../components/shared/VenueProfilePublicView';
import { FoundingVenueBadge } from '../components/venue/FoundingVenueBadge';
import type { User } from '../App';
import { supabase } from '../lib/supabase';

interface PublicVenuePageProps {
  venueId: string;
}

export function PublicVenuePage({ venueId }: PublicVenuePageProps) {
  const visitorUser: User = useMemo(
    () => ({ id: 'visitor', name: 'Visitor', email: '', role: 'artist' }),
    []
  );

  const [venue, setVenue] = useState<VenuePublicData | null>(null);
  const [foundingInfo, setFoundingInfo] = useState<{ isFounding: boolean; featuredUntil: string | null }>({ isFounding: false, featuredUntil: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('venues')
          .select('id,name,cover_photo_url,address,city,bio,labels,verified,founded_year,type,website,instagram_handle,is_founding,founding_end,featured_until')
          .eq('id', venueId)
          .single();

        if (error) {
          console.warn('PublicVenuePage query error:', error.message, error.code);
        }

        if (!cancelled && data) {
          setVenue({
            id: data.id,
            name: data.name || 'Venue',
            bio: data.bio || null,
            coverPhotoUrl: data.cover_photo_url || null,
            city: data.city || null,
            address: data.address || null,
            type: data.type || null,
            labels: data.labels || [],
            verified: Boolean(data.verified),
            foundedYear: data.founded_year || null,
            websiteUrl: data.website || null,
            instagramHandle: data.instagram_handle || null,
          });
          const now = new Date().toISOString();
          setFoundingInfo({
            isFounding: data.is_founding === true && data.founding_end && data.founding_end > now,
            featuredUntil: data.featured_until || null,
          });
        }
      } catch (err) {
        console.warn('Failed to load public venue', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [venueId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Minimal branding header – matches PublicArtistProfilePage */}
      <header className="bg-[var(--surface-2)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl tracking-tight text-[var(--text)] hover:opacity-80 transition-opacity"
          >
            Artwalls
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : venue ? (
          <>
            {/* Founding Venue badge */}
            {foundingInfo.isFounding && (
              <div className="mb-4">
                <FoundingVenueBadge variant="full" featuredUntil={foundingInfo.featuredUntil} />
              </div>
            )}

            {/* Shared public view header card */}
            <VenueProfilePublicView venue={venue} variant="full" />

            {/* In-app view (wall spaces, install window, etc.) below the header */}
            <div className="mt-6">
              <VenueProfileView
                isOwnProfile={false}
                venueId={venueId}
                currentUser={visitorUser}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <Store className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Venue not found</h2>
            <p className="text-[var(--text-muted)]">This venue profile may not be available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
