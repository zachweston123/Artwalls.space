/**
 * VenuePages — all venue-role page rendering.
 *
 * Extracted from App.tsx to reduce its size and make venue
 * routing independently testable.
 */
import { apiPost } from '../lib/api';
import type { User, NavigateFn } from '../types/app';
import {
  VenueDashboard,
  VenueSetupWizard,
  VenuePartnerKitEmbedded,
  VenueWalls,
  VenueCalls,
  VenueCallDetail,
  ApplicationsAndInvitations,
  VenueCurrentArtWithScheduling,
  VenueSales,
  VenueAnalytics,
  VenueWallStats,
  VenuePerformance,
  VenueStatement,
  VenueSettingsWithEmptyState,
  VenueProfile,
  VenuePasswordSecurity,
  VenueNotificationPreferences,
  NotificationsList,
  FindArtHub,
  CuratedSetsMarketplace,
  FindArtists,
  ArtistProfileView,
} from './lazyPages';

export interface VenuePagesProps {
  currentPage: string;
  currentUser: User;
  onNavigate: NavigateFn;
  selectedCallId: string | null;
  selectedArtistId: string | null;
  setSelectedArtistId: (id: string | null) => void;
  hasAcceptedAgreement: boolean | null;
}

export function VenuePages({
  currentPage,
  currentUser,
  onNavigate,
  selectedCallId,
  selectedArtistId,
  setSelectedArtistId,
  hasAcceptedAgreement,
}: VenuePagesProps) {
  return (
    <>
      {currentPage === 'venue-dashboard' && <VenueDashboard onNavigate={onNavigate} user={currentUser} hasAcceptedAgreement={hasAcceptedAgreement} />}
      {currentPage === 'venue-setup' && <VenueSetupWizard onNavigate={onNavigate} onComplete={() => onNavigate('venue-dashboard')} />}
      {currentPage === 'venue-partner-kit' && <VenuePartnerKitEmbedded onNavigate={onNavigate} />}
      {currentPage === 'venue-walls' && <VenueWalls />}
      {currentPage === 'venue-calls' && <VenueCalls user={currentUser} onViewCall={(callId) => onNavigate('venue-call-detail', { callId })} />}
      {currentPage === 'venue-call-detail' && selectedCallId && <VenueCallDetail callId={selectedCallId} onBack={() => onNavigate('venue-calls')} />}
      {currentPage === 'venue-applications' && <ApplicationsAndInvitations userRole="venue" onBack={() => onNavigate('venue-dashboard')} />}
      {currentPage === 'venue-current' && <VenueCurrentArtWithScheduling />}
      {currentPage === 'venue-sales' && <VenueSales user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'venue-analytics' && <VenueAnalytics user={currentUser} />}
      {currentPage === 'venue-wall-stats' && <VenueWallStats user={currentUser} />}
      {currentPage === 'venue-performance' && <VenuePerformance user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'venue-statement' && <VenueStatement user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'venue-settings' && <VenueSettingsWithEmptyState />}
      {currentPage === 'venue-profile' && <VenueProfile onNavigate={onNavigate} />}
      {currentPage === 'venue-password-security' && <VenuePasswordSecurity onBack={() => onNavigate('venue-profile')} />}
      {currentPage === 'venue-notifications' && <VenueNotificationPreferences onBack={() => onNavigate('venue-profile')} />}
      {currentPage === 'venue-notifications-center' && <NotificationsList user={currentUser} onNavigate={onNavigate} />}
      {currentPage === 'find-art' && <FindArtHub onNavigate={onNavigate} />}
      {currentPage === 'venue-curated-sets' && <CuratedSetsMarketplace onNavigate={onNavigate} />}
      {currentPage === 'venue-find-artists' && (
        <FindArtists
          onViewProfile={(artistId) => {
            setSelectedArtistId(artistId);
            onNavigate('artist-view-profile');
          }}
          onInviteArtist={(artistId) => {
            setSelectedArtistId(artistId);
            onNavigate('artist-view-profile');
          }}
        />
      )}
      {currentPage === 'artist-view-profile' && selectedArtistId && (
        <ArtistProfileView
          artistId={selectedArtistId}
          isOwnProfile={false}
          currentUser={currentUser}
          onInviteToApply={async () => {
            try {
              await apiPost('/api/support/messages', {
                email: currentUser.email || 'venue@artwalls.space',
                message: `Venue invite-to-apply: venue ${currentUser.id} wants to invite artist ${selectedArtistId} to display.`,
                roleContext: 'venue',
                pageSource: 'artist-view-profile',
              });
              alert('Invitation sent! The artist will be notified.');
            } catch {
              alert('Unable to send invitation right now. Please try again.');
            }
          }}
        />
      )}
    </>
  );
}
