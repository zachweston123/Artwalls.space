/**
 * ArtistPages — all artist-role page rendering.
 *
 * Extracted from App.tsx to reduce its size and make artist
 * routing independently testable.
 */
import { apiPost } from '../lib/api';
import type { User, NavigateFn } from '../types/app';
import {
  ArtistOnboardingWizard,
  ArtistDashboard,
  ArtistArtworks,
  CuratedSets,
  ArtistAnalytics,
  ApplicationsAndInvitations,
  FindVenues,
  VenueProfileView,
  VenueWallsPublic,
  ArtistInvites,
  ArtistInviteVenue,
  ArtistReferrals,
  ArtistSales,
  ArtistProfile,
  PasswordSecurity,
  NotificationPreferences,
  NotificationsList,
  Settings,
} from './lazyPages';

export interface ArtistPagesProps {
  currentPage: string;
  currentUser: User;
  onNavigate: NavigateFn;
  selectedVenueId: string | null;
  setSelectedVenueId: (id: string | null) => void;
  artistOnboarding: { completed: boolean; step: number | null } | null;
  setArtistOnboarding: (val: { completed: boolean; step: number | null } | null) => void;
  snoozeArtistOnboarding: () => void;
}

export function ArtistPages({
  currentPage,
  currentUser,
  onNavigate,
  selectedVenueId,
  setSelectedVenueId,
  artistOnboarding,
  setArtistOnboarding,
  snoozeArtistOnboarding,
}: ArtistPagesProps) {
  return (
    <>
      {currentPage === 'artist-onboarding' && <ArtistOnboardingWizard user={currentUser} onComplete={() => { setArtistOnboarding({ completed: true, step: null }); onNavigate('artist-dashboard'); }} onSkip={() => { snoozeArtistOnboarding(); onNavigate('artist-dashboard'); }} />}
      {currentPage === 'artist-dashboard' && <ArtistDashboard onNavigate={onNavigate} user={currentUser} />}
      {currentPage === 'artist-artworks' && <ArtistArtworks user={currentUser} />}
      {currentPage === 'artist-curated-sets' && <CuratedSets user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'artist-analytics' && <ArtistAnalytics user={currentUser} />}
      {currentPage === 'artist-approved' && <ApplicationsAndInvitations userRole="artist" defaultTab="approved" onBack={() => onNavigate('artist-dashboard')} />}
      {currentPage === 'artist-venues' && (
        <FindVenues 
          onViewVenue={(venueId) => {
            setSelectedVenueId(venueId);
            onNavigate('venue-view-profile');
          }} 
          onViewWallspaces={(venueId) => {
            setSelectedVenueId(venueId);
            onNavigate('venue-view-wallspaces');
          }} 
        />
      )}
      {currentPage === 'venue-view-profile' && (
        <VenueProfileView 
          isOwnProfile={false}
          venueId={selectedVenueId || undefined}
          onViewWallspaces={() => onNavigate('venue-view-wallspaces')}
          onNavigate={onNavigate}
          currentUser={currentUser}
        />
      )}
      {currentPage === 'venue-view-wallspaces' && (
        <VenueWallsPublic venueId={selectedVenueId || undefined} onBack={() => onNavigate('artist-venues')} />
      )}
      {currentPage === 'artist-applications' && <ApplicationsAndInvitations userRole="artist" onBack={() => onNavigate('artist-profile')} />}
      {currentPage === 'artist-invites' && (
        <ArtistInvites 
          onApply={(inviteId) => onNavigate('artist-applications')}
          onDecline={async (inviteId) => {
            if (confirm('Are you sure you want to decline this invitation?')) {
              try {
                await apiPost(`/api/venue-invites/token/${inviteId}/decline`, {});
              } catch {
                // Fallback to direct Supabase update
                const { supabase } = await import('../lib/supabase');
                await supabase.from('venue_invites').update({ status: 'DECLINED', declined_at: new Date().toISOString() }).eq('id', inviteId);
              }
            }
          }}
          onNavigate={onNavigate}
          artistId={currentUser.id}
        />
      )}
      {currentPage === 'artist-invite-venue' && <ArtistInviteVenue onNavigate={onNavigate} />}
      {currentPage === 'artist-referrals' && <ArtistReferrals />}
      {currentPage === 'artist-sales' && <ArtistSales user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'artist-profile' && <ArtistProfile onNavigate={onNavigate} />}
      {currentPage === 'artist-password-security' && <PasswordSecurity onBack={() => onNavigate('artist-profile')} />}
      {currentPage === 'artist-notifications' && <NotificationPreferences onBack={() => onNavigate('artist-profile')} />}
      {currentPage === 'artist-notifications-center' && <NotificationsList user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'artist-notifications-legacy' && <NotificationsList user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'artist-settings' && <Settings onNavigate={onNavigate} />}
    </>
  );
}
