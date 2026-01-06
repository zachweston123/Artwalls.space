import { useState } from 'react';
import { QrCode, MapPin, Calendar, X, Clock, CheckCircle } from 'lucide-react';
import { mockInstalledArtworks } from '../../data/mockData';
import type { InstalledArtwork } from '../../data/mockData';
import { TimeSlotPicker } from '../scheduling/TimeSlotPicker';
import { DurationBadge } from '../scheduling/DisplayDurationSelector';
import { createVenueBooking, API_BASE } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export function VenueCurrentArtWithScheduling() {
  const [artworks, setArtworks] = useState<InstalledArtwork[]>(mockInstalledArtworks);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'ending-soon' | 'needs-pickup'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ id: string; action: string; artwork?: InstalledArtwork } | null>(null);
  const [qrArtwork, setQrArtwork] = useState<InstalledArtwork | null>(null);
  const [currentVenueId, setCurrentVenueId] = useState<string>('');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentVenueId(data.user?.id || '');
    }).catch(() => setCurrentVenueId(''));
  }, []);

  const filteredArtworks = artworks.filter(artwork => {
    if (filter === 'all') return true;
    return artwork.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      'active': { bg: 'bg-[var(--green-muted)]', text: 'text-[var(--green)]', label: 'Active' },
      'sold': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--blue)]', label: 'Sold' },
      'ending-soon': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--warning)]', label: 'Ending Soon' },
      'needs-pickup': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--warning)]', label: 'Needs Pickup' },
      'ended': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--text-muted)]', label: 'Ended' },
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

  const handleTimeConfirm = async (timeIso: string) => {
    if (!selectedAction) return;
    try {
      let bookingId: string | null = null;
      let bookingLinks: { ics: string; google: string } | undefined;
      if (selectedAction.artwork && currentVenueId) {
        const type = selectedAction.action === 'schedule-pickup' ? 'pickup' : 'install';
        const { booking, links } = await createVenueBooking(currentVenueId, { artworkId: selectedAction.artwork.artworkId, type: type as 'install' | 'pickup', startAt: timeIso });
        bookingId = booking?.id || null;
        bookingLinks = links || undefined;
      }
      const d = new Date(timeIso);
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const label = `${day} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      setArtworks(artworks.map(artwork => {
        if (artwork.id === selectedAction.id) {
          if (selectedAction.action === 'schedule-install' || selectedAction.action === 'reschedule') {
            return { ...artwork, scheduledInstall: label, scheduledInstallBookingId: bookingId, scheduledInstallLinks: bookingLinks } as any;
          } else if (selectedAction.action === 'schedule-pickup') {
            return { ...artwork, scheduledPickup: label, scheduledPickupBookingId: bookingId, scheduledPickupLinks: bookingLinks } as any;
          }
        }
        return artwork;
      }));
    } catch (e) {
      // noop: real app toast
    } finally {
      setShowSchedulePicker(false);
      setSelectedAction(null);
    }
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
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Current Artwork</h1>
        <p className="text-[var(--text-muted)]">
          {activeCount} active • {soldCount} sold • {endingSoonCount} ending soon
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
          }`}
        >
          All ({artworks.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'active'
              ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilter('sold')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'sold'
              ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
          }`}
        >
          Sold ({soldCount})
        </button>
        <button
          onClick={() => setFilter('ending-soon')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'ending-soon'
              ? 'bg-[var(--green)] text-[var(--accent-contrast)]'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]'
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
            className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-6 p-4 sm:p-6">
              {/* Artwork Image */}
              <div className="w-full md:w-48 h-48 md:h-auto bg-[var(--surface-2)] rounded-lg overflow-hidden flex-shrink-0">
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
                    <h3 className="text-xl mb-1 text-[var(--text)]">{artwork.artworkTitle}</h3>
                    <p className="text-[var(--text-muted)]">by {artwork.artistName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(artwork.status)}
                    <span className="text-lg">${artwork.price}</span>
                  </div>
                </div>

                {/* Display Term Info */}
                <div className="mb-4 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">Display term:</span>
                      <DurationBadge duration={(artwork as any).displayDuration || 90} size="sm" />
                    </div>
                    <div className="text-[var(--text-muted)]">•</div>
                    <div className="text-[var(--text-muted)]">
                      <span className="text-[var(--text-muted)]">Ends:</span>{' '}
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
                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-lg text-sm">
                        <Clock className="w-4 h-4 text-[var(--blue)]" />
                        <span className="text-[var(--text)]">
                          Install scheduled: <strong>{artwork.scheduledInstall}</strong>
                        </span>
                        {((artwork as any).scheduledInstallLinks || (artwork as any).scheduledInstallBookingId) && (
                          <>
                            <a className="text-[var(--blue)] underline ml-2" href={(artwork as any).scheduledInstallLinks?.google || `${API_BASE}/api/bookings/${(artwork as any).scheduledInstallBookingId}/google`} target="_blank" rel="noreferrer">Google</a>
                            <a className="text-[var(--blue)] underline" href={(artwork as any).scheduledInstallLinks?.ics || `${API_BASE}/api/bookings/${(artwork as any).scheduledInstallBookingId}/ics`} target="_blank" rel="noreferrer">.ics</a>
                          </>
                        )}
                        {artwork.installConfirmed && (
                          <CheckCircle className="w-4 h-4 text-[var(--green)]" />
                        )}
                      </div>
                    )}
                    {artwork.scheduledPickup && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-lg text-sm">
                        <Clock className="w-4 h-4 text-[var(--warning)]" />
                        <span className="text-[var(--text)]">
                          Pickup scheduled: <strong>{artwork.scheduledPickup}</strong>
                        </span>
                        {((artwork as any).scheduledPickupLinks || (artwork as any).scheduledPickupBookingId) && (
                          <>
                            <a className="text-[var(--blue)] underline ml-2" href={(artwork as any).scheduledPickupLinks?.google || `${API_BASE}/api/bookings/${(artwork as any).scheduledPickupBookingId}/google`} target="_blank" rel="noreferrer">Google</a>
                            <a className="text-[var(--blue)] underline" href={(artwork as any).scheduledPickupLinks?.ics || `${API_BASE}/api/bookings/${(artwork as any).scheduledPickupBookingId}/ics`} target="_blank" rel="noreferrer">.ics</a>
                          </>
                        )}
                        {artwork.pickupConfirmed && (
                          <CheckCircle className="w-4 h-4 text-[var(--green)]" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[var(--text-muted)]">Wall Location</span>
                      <p className="text-[var(--text)]">{artwork.wallSpaceName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[var(--text-muted)]">Install Date</span>
                      <p className="text-[var(--text)]">
                        {new Date(artwork.installDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[var(--text-muted)]">End Date</span>
                      <p className="text-[var(--text)]">
                        {new Date(artwork.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <QrCode className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[var(--text-muted)]">QR Code</span>
                      <button className="text-[var(--green)] hover:opacity-80 underline" onClick={() => setQrArtwork(artwork)}>
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
                          className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors text-sm"
                        >
                          Confirm Installed
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button
                        onClick={() => handleAction(artwork.id, 'end-display')}
                        className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors text-sm"
                      >
                        End Display
                      </button>
                      {artwork.scheduledInstall && (
                        <button
                          onClick={() => handleAction(artwork.id, 'reschedule', artwork)}
                          className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors text-sm"
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
                          className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors text-sm"
                        >
                          Schedule Pickup
                        </button>
                      ) : !artwork.pickupConfirmed ? (
                        <button
                          onClick={() => handleAction(artwork.id, 'confirm-pickup')}
                          className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors text-sm"
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
                        className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button className="px-4 py-2 bg-[var(--surface-2)] text-[var(--blue)] rounded-lg hover:bg-[var(--surface-3)] transition-colors text-sm">
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
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          {filter === 'all' && (
            <>
              <h3 className="text-xl mb-2 text-[var(--text)]">No artwork on display</h3>
              <p className="text-[var(--text-muted)] mb-6">
                Review artist applications to start displaying artwork
              </p>
              <button className="px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors">
                View Applications
              </button>
            </>
          )}
          {filter !== 'all' && (
            <>
              <h3 className="text-xl mb-2 text-[var(--text)]">No {filter.replace('-', ' ')} artwork</h3>
              <p className="text-[var(--text-muted)]">Try selecting a different filter</p>
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
          venueId={currentVenueId}
          type={selectedAction.action === 'schedule-pickup' ? 'pickup' : 'install'}
          artworkTitle={selectedAction.artwork.artworkTitle}
          onConfirm={handleTimeConfirm}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-[var(--text)]">Confirm Action</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-muted)] mb-6">
              Are you sure you want to {getActionLabel(selectedAction.action).toLowerCase()}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrArtwork && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-[var(--text)]">Artwork QR Code</h3>
              <button onClick={() => setQrArtwork(null)} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[var(--text-muted)]">Use this QR for customer purchase and info.</p>
              <div className="flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${window.location.origin}/purchase/${qrArtwork.id}`)}`}
                  alt="QR Code"
                  className="w-60 h-60 border border-[var(--border)] rounded-lg bg-[var(--surface-2)]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setQrArtwork(null)} className="flex-1 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors">
                  Close
                </button>
                <button onClick={() => window.print()} className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity">
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}