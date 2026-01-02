import { useState } from 'react';
import { Mail, MapPin, Calendar, CheckCircle, X as XIcon } from 'lucide-react';

interface ArtistInvitesProps {
  onApply: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onNavigate: (page: string) => void;
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

export function ArtistInvites({ onApply, onDecline, onNavigate }: ArtistInvitesProps) {
  const [selectedInvite, setSelectedInvite] = useState<string | null>(null);

  // Mock invites data
  const mockInvites: Invite[] = [
    {
      id: '1',
      venueName: 'Brew & Palette Café',
      venuePhoto: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400',
      venueLocation: 'Pearl District, Portland',
      wallspaceName: 'Main Gallery Wall',
      wallspaceSize: '96" × 72"',
      duration: 90,
      message: 'Hi Sarah,\n\nWe\'d love to feature your work at Brew & Palette Café. Your artistic style would be a great fit for our space and community.\n\nWe\'re inviting you to apply for a 90-day display. Please let us know if you\'re interested!\n\nLooking forward to potentially working together.',
      timestamp: '2024-01-15T10:30:00',
      status: 'pending',
    },
    {
      id: '2',
      venueName: 'The Artisan Lounge',
      venuePhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      venueLocation: 'Downtown, Portland',
      duration: 180,
      message: 'We\'re impressed by your mixed media work and would love to discuss a 6-month display at The Artisan Lounge.',
      timestamp: '2024-01-14T14:20:00',
      status: 'pending',
    },
    {
      id: '3',
      venueName: 'Revolution Coffee House',
      venuePhoto: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
      venueLocation: 'Alberta Arts, Portland',
      wallspaceName: 'Corner Display',
      wallspaceSize: '48" × 60"',
      duration: 30,
      message: 'Hi! We have a spot opening up next month and think your work would be perfect.',
      timestamp: '2024-01-10T09:15:00',
      status: 'accepted',
    },
  ];

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
    <div className="bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2 dark:text-neutral-50">Invitations</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          Venues have invited you to display your artwork
        </p>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl mb-4">New Invitations ({pendingInvites.length})</h2>
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-white dark:bg-neutral-800 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all"
              >
                <div className="flex gap-4">
                  {/* Venue Photo */}
                  <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden flex-shrink-0">
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
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          <MapPin className="w-3 h-3" />
                          {invite.venueLocation}
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(invite.timestamp)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 mb-3">
                      {invite.wallspaceName && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 px-3 py-1.5 rounded-full">
                          <span className="text-neutral-900 dark:text-neutral-50">{invite.wallspaceName}</span>
                          {invite.wallspaceSize && <span>• {invite.wallspaceSize}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 px-3 py-1.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {invite.duration} days
                      </div>
                    </div>

                    {/* Message Preview */}
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-2">
                      {invite.message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedInvite(invite.id)}
                        className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(invite.id)}
                        className="px-6 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
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
                className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={invite.venuePhoto}
                      alt={invite.venueName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm">{invite.venueName}</h4>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        • {formatDate(invite.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {invite.status === 'accepted' ? (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Applied
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
                          Declined
                        </span>
                      )}
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No invites yet</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            Complete your profile to be discoverable by venues
          </p>
          <button
            onClick={() => onNavigate('artist-profile')}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInviteData && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl">Invitation Details</h2>
              <button
                onClick={() => setSelectedInvite(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Venue Info */}
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-lg overflow-hidden">
                  <img
                    src={selectedInviteData.venuePhoto}
                    alt={selectedInviteData.venueName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl mb-2">{selectedInviteData.venueName}</h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <MapPin className="w-4 h-4" />
                    {selectedInviteData.venueLocation}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInviteData.wallspaceName && (
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Wall Space</p>
                    <p className="text-sm">{selectedInviteData.wallspaceName}</p>
                    {selectedInviteData.wallspaceSize && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {selectedInviteData.wallspaceSize}
                      </p>
                    )}
                  </div>
                )}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Duration</p>
                  <p className="text-sm">{selectedInviteData.duration} days</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    ~{Math.round(selectedInviteData.duration / 30)} months
                  </p>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">Message from venue:</p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-sm text-neutral-900 dark:text-neutral-50 whitespace-pre-wrap">
                    {selectedInviteData.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => handleDecline(selectedInviteData.id)}
                  className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(selectedInviteData.id)}
                  className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
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
