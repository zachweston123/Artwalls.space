import { useState } from 'react';
import { Mail, MapPin, Calendar, CheckCircle, X as XIcon } from 'lucide-react';
import { ArtistVenueInvites } from './ArtistVenueInvites';

interface ArtistInvitesProps {
  onApply: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onNavigate: (page: string) => void;
  artistId: string;
}

interface Invite {
  id: string;
  venueName: string;
  venuePhoto: string;
  venueLocation: string;
  wallspaceName?: string;
  wallspaceSize?: string;
  duration: number;
  message: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}

export function ArtistInvites({ onApply, onDecline, onNavigate, artistId }: ArtistInvitesProps) {
  const [selectedInvite, setSelectedInvite] = useState<string | null>(null);

  // Mock invites data
  const mockInvites: Invite[] = [];

  const [invites, setInvites] = useState(mockInvites);

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const respondedInvites = invites.filter(i => i.status !== 'pending');

  const selectedInviteData = invites.find(i => i.id === selectedInvite);

  const handleAccept = (inviteId: string) => {
    setInvites(invites.map(inv => 
      inv.id === inviteId ? { ...inv, status: 'accepted' as const } : inv
    ));
    onApply(inviteId);
    setSelectedInvite(null);
  };

  const handleDecline = (inviteId: string) => {
    setInvites(invites.map(inv => 
      inv.id === inviteId ? { ...inv, status: 'declined' as const } : inv
    ));
    onDecline(inviteId);
    setSelectedInvite(null);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Invitations</h1>
        <p className="text-[var(--text-muted)]">
          Invite venues and track incoming invitations in one place.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="text-xl mb-4">Invite a venue to display art</h2>
        <ArtistVenueInvites artistId={artistId} embedded />
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl mb-4">New Invitations ({pendingInvites.length})</h2>
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-[var(--surface-1)] rounded-xl p-6 border-2 border-[var(--blue)] hover:shadow-lg transition-all"
              >
                <div className="flex gap-4">
                  {/* Venue Photo */}
                  <div className="w-20 h-20 bg-[var(--surface-2)] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={invite.venuePhoto}
                      alt={invite.venueName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg mb-1">{invite.venueName}</h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
                          <MapPin className="w-3 h-3" />
                          {invite.venueLocation}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(invite.timestamp)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 mb-3">
                      {invite.wallspaceName && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-full">
                          <span className="text-[var(--text)]">{invite.wallspaceName}</span>
                          {invite.wallspaceSize && <span>• {invite.wallspaceSize}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {invite.duration} days
                      </div>
                    </div>

                    {/* Message Preview */}
                    <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
                      {invite.message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedInvite(invite.id)}
                        className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        className="px-4 py-2 text-sm bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(invite.id)}
                        className="px-6 py-2 text-sm bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
                      >
                        Apply with Artwork
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responded Invites */}
      {respondedInvites.length > 0 && (
        <div>
          <h2 className="text-xl mb-4">Previous Invitations</h2>
          <div className="space-y-3">
            {respondedInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--surface-2)] rounded overflow-hidden flex-shrink-0">
                    <img
                      src={invite.venuePhoto}
                      alt={invite.venueName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm">{invite.venueName}</h4>
                      <span className="text-xs text-[var(--text-muted)]">
                        • {formatDate(invite.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {invite.status === 'accepted' ? (
                        <span className="text-xs px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Applied
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-full">
                          Declined
                        </span>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">
                        {invite.duration} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingInvites.length === 0 && respondedInvites.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2">No invites yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Complete your profile to be discoverable by venues
          </p>
          <button
            onClick={() => onNavigate('artist-profile')}
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInviteData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface-1)] border-b border-[var(--border)] p-6 flex items-center justify-between">
              <h2 className="text-2xl">Invitation Details</h2>
              <button
                onClick={() => setSelectedInvite(null)}
                className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Venue Info */}
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-[var(--surface-2)] rounded-lg overflow-hidden border border-[var(--border)]">
                  <img
                    src={selectedInviteData.venuePhoto}
                    alt={selectedInviteData.venueName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl mb-2">{selectedInviteData.venueName}</h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <MapPin className="w-4 h-4" />
                    {selectedInviteData.venueLocation}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInviteData.wallspaceName && (
                  <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Wall Space</p>
                    <p className="text-sm">{selectedInviteData.wallspaceName}</p>
                    {selectedInviteData.wallspaceSize && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {selectedInviteData.wallspaceSize}
                      </p>
                    )}
                  </div>
                )}
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Duration</p>
                  <p className="text-sm">{selectedInviteData.duration} days</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    ~{Math.round(selectedInviteData.duration / 30)} months
                  </p>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm text-[var(--text)] mb-2">Message from venue:</p>
                <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] border-l-4 border-l-[var(--blue)]">
                  <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
                    {selectedInviteData.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => handleDecline(selectedInviteData.id)}
                  className="flex-1 px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(selectedInviteData.id)}
                  className="flex-1 px-4 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
                >
                  Apply with Artwork
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
