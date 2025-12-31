import { useState } from 'react';
import { QrCode, MapPin, Calendar, X, Clock, CheckCircle } from 'lucide-react';
import { mockInstalledArtworks, mockVenueSchedule } from '../../data/mockData';
import type { InstalledArtwork } from '../../data/mockData';
import { TimeSlotPicker } from '../scheduling/TimeSlotPicker';
import { DurationBadge } from '../scheduling/DisplayDurationSelector';

export function VenueCurrentArtWithScheduling() {
  const [artworks, setArtworks] = useState<InstalledArtwork[]>(mockInstalledArtworks);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'ending-soon' | 'needs-pickup'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ id: string; action: string; artwork?: InstalledArtwork } | null>(null);

  const filteredArtworks = artworks.filter(artwork => {
    if (filter === 'all') return true;
    return artwork.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      'active': { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      'sold': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sold' },
      'ending-soon': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Ending Soon' },
      'needs-pickup': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Needs Pickup' },
      'ended': { bg: 'bg-neutral-100', text: 'text-neutral-700', label: 'Ended' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const handleAction = (id: string, action: string, artwork?: InstalledArtwork) => {
    if (action === 'schedule-install' || action === 'schedule-pickup' || action === 'reschedule') {
      setSelectedAction({ id, action, artwork });
      setShowSchedulePicker(true);
    } else {
      setSelectedAction({ id, action });
      setShowConfirmModal(true);
    }
  };

  const confirmAction = () => {
    if (!selectedAction) return;
    
    setArtworks(artworks.map(artwork => {
      if (artwork.id === selectedAction.id) {
        switch (selectedAction.action) {
          case 'mark-sold':
            return { ...artwork, status: 'sold' as const };
          case 'confirm-installed':
            return { ...artwork, installConfirmed: true };
          case 'confirm-pickup':
            return { ...artwork, status: 'ended' as const, pickupConfirmed: true };
          case 'end-display':
            return { ...artwork, status: 'ended' as const };
          default:
            return artwork;
        }
      }
      return artwork;
    }));

    setShowConfirmModal(false);
    setSelectedAction(null);
  };

  const handleTimeConfirm = (time: string) => {
    if (!selectedAction) return;

    const formatTime = (timeString: string) => {
      const [hour, minute] = timeString.split(':');
      const h = parseInt(hour);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const day = mockVenueSchedule.dayOfWeek.substring(0, 3);
      return `${day} ${displayHour}:${minute} ${ampm}`;
    };

    setArtworks(artworks.map(artwork => {
      if (artwork.id === selectedAction.id) {
        if (selectedAction.action === 'schedule-install' || selectedAction.action === 'reschedule') {
          return { ...artwork, scheduledInstall: formatTime(time) };
        } else if (selectedAction.action === 'schedule-pickup') {
          return { ...artwork, scheduledPickup: formatTime(time) };
        }
      }
      return artwork;
    }));

    setShowSchedulePicker(false);
    setSelectedAction(null);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'mark-sold': return 'Mark as Sold';
      case 'confirm-installed': return 'Confirm Installed';
      case 'confirm-pickup': return 'Confirm Pickup';
      case 'end-display': return 'End Display';
      default: return action;
    }
  };

  const activeCount = artworks.filter(a => a.status === 'active').length;
  const soldCount = artworks.filter(a => a.status === 'sold').length;
  const endingSoonCount = artworks.filter(a => a.status === 'ending-soon').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900">Current Artwork</h1>
        <p className="text-neutral-600">
          {activeCount} active • {soldCount} sold • {endingSoonCount} ending soon
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          All ({artworks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('sold')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'sold'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Sold ({soldCount})
        </button>
        <button
          onClick={() => setFilter('ending-soon')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'ending-soon'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Ending Soon ({endingSoonCount})
        </button>
      </div>

      {/* Artwork List */}
      <div className="space-y-4">
        {filteredArtworks.map((artwork) => (
          <div
            key={artwork.id}
            className="bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-6 p-4 sm:p-6">
              {/* Artwork Image */}
              <div className="w-full md:w-48 h-48 md:h-auto bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={artwork.artworkImage}
                  alt={artwork.artworkTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Artwork Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl mb-1 text-neutral-900">{artwork.artworkTitle}</h3>
                    <p className="text-neutral-600">by {artwork.artistName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(artwork.status)}
                    <span className="text-lg">${artwork.price}</span>
                  </div>
                </div>

                {/* Display Term Info */}
                <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600">Display term:</span>
                      <DurationBadge duration={(artwork as any).displayDuration || 90} size="sm" />
                    </div>
                    <div className="text-neutral-400">•</div>
                    <div className="text-neutral-600">
                      <span className="text-neutral-500">Ends:</span>{' '}
                      <strong>
                        {new Date(artwork.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Scheduling Status */}
                {(artwork.scheduledInstall || artwork.scheduledPickup) && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {artwork.scheduledInstall && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-900">
                          Install scheduled: <strong>{artwork.scheduledInstall}</strong>
                        </span>
                        {artwork.installConfirmed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    )}
                    {artwork.scheduledPickup && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg text-sm">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-orange-900">
                          Pickup scheduled: <strong>{artwork.scheduledPickup}</strong>
                        </span>
                        {artwork.pickupConfirmed && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500">Wall Location</span>
                      <p className="text-neutral-900">{artwork.wallSpaceName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500">Install Date</span>
                      <p className="text-neutral-900">
                        {new Date(artwork.installDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500">End Date</span>
                      <p className="text-neutral-900">
                        {new Date(artwork.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <QrCode className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-neutral-500">QR Code</span>
                      <button className="text-green-600 hover:text-green-700 underline">
                        View / Print
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {artwork.status === 'active' && (
                    <>
                      {!artwork.installConfirmed && artwork.scheduledInstall && (
                        <button
                          onClick={() => handleAction(artwork.id, 'confirm-installed')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Confirm Installed
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button
                        onClick={() => handleAction(artwork.id, 'end-display')}
                        className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                      >
                        End Display
                      </button>
                      {artwork.scheduledInstall && (
                        <button
                          onClick={() => handleAction(artwork.id, 'reschedule', artwork)}
                          className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                        >
                          Reschedule
                        </button>
                      )}
                    </>
                  )}
                  {artwork.status === 'sold' && (
                    <>
                      {!artwork.scheduledPickup ? (
                        <button
                          onClick={() => handleAction(artwork.id, 'schedule-pickup', artwork)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Schedule Pickup
                        </button>
                      ) : !artwork.pickupConfirmed ? (
                        <button
                          onClick={() => handleAction(artwork.id, 'confirm-pickup')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Confirm Pickup Completed
                        </button>
                      ) : null}
                    </>
                  )}
                  {artwork.status === 'ending-soon' && (
                    <>
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                        Request Replacement
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty States */}
      {filteredArtworks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-neutral-400" />
          </div>
          {filter === 'all' && (
            <>
              <h3 className="text-xl mb-2 text-neutral-900">No artwork on display</h3>
              <p className="text-neutral-600 mb-6">
                Review artist applications to start displaying artwork
              </p>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                View Applications
              </button>
            </>
          )}
          {filter !== 'all' && (
            <>
              <h3 className="text-xl mb-2 text-neutral-900">No {filter.replace('-', ' ')} artwork</h3>
              <p className="text-neutral-600">Try selecting a different filter</p>
            </>
          )}
        </div>
      )}

      {/* Time Slot Picker Modal */}
      {showSchedulePicker && selectedAction?.artwork && (
        <TimeSlotPicker
          isOpen={showSchedulePicker}
          onClose={() => {
            setShowSchedulePicker(false);
            setSelectedAction(null);
          }}
          windowDay={mockVenueSchedule.dayOfWeek}
          startTime={mockVenueSchedule.startTime}
          endTime={mockVenueSchedule.endTime}
          type={selectedAction.action === 'schedule-pickup' ? 'pickup' : 'install'}
          artworkTitle={selectedAction.artwork.artworkTitle}
          onConfirm={handleTimeConfirm}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-neutral-900">Confirm Action</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to {getActionLabel(selectedAction.action).toLowerCase()}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}