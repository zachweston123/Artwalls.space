import { useEffect, useState } from 'react';
import { MapPin, Users, X, Image as ImageIcon, Clock, AlertCircle } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { getVenueImageUrl } from '../../lib/venueImage';
import { VenueImage } from '../shared/VenueImage';
import { STATUS_LABELS, STATUS_COLORS, TIER_REQUEST_LIMITS, type ArtistTier } from '../../lib/venueRequests';

interface SimpleArtwork {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  status: string;
}

interface Quota {
  tier: ArtistTier;
  limit: number | null;
  used: number;
  remaining: number | null;
}

export function ArtistVenues() {
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState('');
  const [message, setMessage] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [availableArtworks, setAvailableArtworks] = useState<SimpleArtwork[]>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string; type?: string | null; city?: string | null; availableSpaces?: number; wallSpaces?: number; imageUrl?: string; address?: string; description?: string; waitlistEnabled?: boolean }>>([]);
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        // Load artist's available artworks from Supabase
        const { data: authData } = await supabase.auth.getUser();
        const artistId = authData?.user?.id;
        if (artistId) {
          const { data: artworks } = await supabase
            .from('artworks')
            .select('id, title, image_url, price, status')
            .eq('artist_id', artistId)
            .eq('status', 'available');
          if (mounted && artworks) {
            setAvailableArtworks(artworks.map((a: any) => ({
              id: a.id,
              title: a.title || 'Untitled',
              imageUrl: a.image_url || '',
              price: (a.price || 0) / 100,
              status: a.status,
            })));
          }
        }

        // Fetch quota
        try {
          const q = await apiGet<Quota>('/api/me/requests/quota');
          if (mounted && q) setQuota(q);
        } catch { /* non-critical */ }

        // Fetch current artist profile to read preferred cities
        const me = await apiGet<{ role: string; profile: { id: string; city_primary?: string | null; city_secondary?: string | null } }>(
          '/api/profile/me'
        );
        const meId = me?.profile?.id;
        const cp = (me?.profile?.city_primary || '').trim();
        const cs = (me?.profile?.city_secondary || '').trim();
        let path = '/api/venues';
        if (meId || cp || cs) {
          const cities = [cp, cs].filter(Boolean).join(',');
          if (cities) {
            path = `/api/venues?cities=${encodeURIComponent(cities)}`;
          } else if (meId) {
            path = `/api/venues?artistId=${encodeURIComponent(meId)}`;
          }
        }
        const resp = await apiGet<{ venues: Array<{ id: string; name: string; type?: string | null; city?: string | null; waitlistEnabled?: boolean }> }>(path);
        const vns = resp?.venues || [];
        const shaped = vns.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type || null,
          city: v.city || null,
          availableSpaces: (v as any).availableSpaces || 0,
          wallSpaces: (v as any).wallSpaces || 0,
          imageUrl: getVenueImageUrl(v as Record<string, unknown>) || null,
          address: v.city || 'Local area',
          description: (v as any).bio || '',
          waitlistEnabled: v.waitlistEnabled === true,
        }));
        if (mounted) setVenues(shaped);
      } catch {
        if (mounted) setVenues([]);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const isQuotaReached = quota && quota.remaining !== null && quota.remaining <= 0;

  const handleSubmitRequest = async (type: 'application' | 'waitlist') => {
    if (!selectedVenue) return;
    if (type === 'application' && !selectedArtworkId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiPost(`/api/venues/${selectedVenue.id}/requests`, {
        requestType: type,
        artworkId: type === 'application' ? selectedArtworkId : undefined,
        message: message.trim() || undefined,
      });

      // Remove artwork from available list if it was an application
      if (type === 'application' && selectedArtworkId) {
        setAvailableArtworks(prev => prev.filter(a => a.id !== selectedArtworkId));
      }
      // Refresh quota
      try {
        const q = await apiGet<Quota>('/api/me/requests/quota');
        if (q) setQuota(q);
      } catch { /* non-critical */ }

      setShowApplicationForm(false);
      setSelectedVenue(null);
      setSelectedArtworkId('');
      setMessage('');
    } catch (err: any) {
      const body = err?.body || err?.message || 'Failed to submit request';
      setSubmitError(typeof body === 'string' ? body : body.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Available Venues</h1>
        <p className="text-[var(--text-muted)]">Find the perfect space to display your artwork</p>
      </div>

      {/* Quota Bar */}
      {quota && (
        <div className="mb-6 p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] flex items-center gap-3">
          <Clock className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
          <div className="flex-1">
            {quota.limit !== null ? (
              <p className="text-sm text-[var(--text)]">
                <span className="font-semibold">{quota.used}</span> of{' '}
                <span className="font-semibold">{quota.limit}</span> monthly requests used
                {quota.remaining !== null && quota.remaining > 0 && (
                  <span className="text-[var(--text-muted)]"> · {quota.remaining} remaining</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-[var(--text)]">Unlimited requests on your <span className="font-semibold capitalize">{quota.tier}</span> plan</p>
            )}
          </div>
          {isQuotaReached && (
            <span className="px-3 py-1 text-xs font-semibold bg-[var(--red-muted)] text-[var(--red)] rounded-full">
              Limit reached
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(venues.length ? venues : []).map((venue) => {
          const hasSpaces = (venue.availableSpaces ?? 0) > 0;
          const canApply = hasSpaces && !isQuotaReached;
          const canWaitlist = !hasSpaces && venue.waitlistEnabled && !isQuotaReached;

          return (
          <div key={venue.id} className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow">
            <VenueImage
              src={venue.imageUrl}
              alt={venue.name}
              venueId={venue.id}
              size="md"
              className="bg-[var(--surface-3)]"
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl mb-1">{venue.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{venue.type}</p>
                </div>
                <span className={`px-3 py-1 border rounded-full text-xs whitespace-nowrap ${
                  hasSpaces
                    ? 'bg-[var(--surface-2)] text-[var(--blue)] border-[var(--border)]'
                    : venue.waitlistEnabled
                      ? 'bg-[var(--yellow-muted)] text-[var(--yellow)] border-[var(--border)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]'
                }`}>
                  {hasSpaces ? `${venue.availableSpaces} available` : venue.waitlistEnabled ? 'Waitlist open' : 'Full'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {venue.address}
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{venue.description}</p>

              {/* Wall Spaces Info */}
              <div className="mb-4 p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">
                  {hasSpaces
                    ? `${venue.availableSpaces} wall space${venue.availableSpaces !== 1 ? 's' : ''} available`
                    : venue.waitlistEnabled
                      ? 'No spaces available — join the waitlist to be first in line'
                      : 'No spaces currently available'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Users className="w-4 h-4" />
                  {venue.wallSpaces} wall spaces
                </div>
                {canApply ? (
                  <button
                    onClick={() => {
                      setSelectedVenue(venue);
                      setShowApplicationForm(true);
                      setSubmitError(null);
                    }}
                    className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
                  >
                    Apply to Hang
                  </button>
                ) : canWaitlist ? (
                  <button
                    onClick={() => {
                      setSelectedVenue(venue);
                      setShowApplicationForm(true);
                      setSubmitError(null);
                    }}
                    className="px-4 py-2 bg-[var(--yellow)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Join Waitlist
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-lg cursor-not-allowed opacity-60"
                  >
                    {isQuotaReached ? 'Limit reached' : 'Full'}
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Application / Waitlist Modal */}
      {showApplicationForm && selectedVenue && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">
                {(selectedVenue.availableSpaces ?? 0) > 0 ? 'Apply to' : 'Join Waitlist at'} {selectedVenue.name}
              </h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedVenue(null);
                  setSubmitError(null);
                }}
                className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-[var(--red-muted)] rounded-lg border border-[var(--border)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--red)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--red)]">{submitError}</p>
              </div>
            )}

            {(selectedVenue.availableSpaces ?? 0) > 0 ? (
              <>
                {/* Application flow */}
                <div className="mb-6 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--blue)]">
                  <p className="text-sm text-[var(--text)]">
                    <strong>{selectedVenue.name}</strong> has {selectedVenue.availableSpaces} wall space(s) available. Select the artwork you'd like to display.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-3">Select Artwork</label>
                    {availableArtworks.length === 0 ? (
                      <div className="text-center py-8 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                        <p className="text-[var(--text-muted)]">You don't have any available artworks.</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Upload a new piece to apply</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {availableArtworks.map((artwork) => (
                          <button
                            key={artwork.id}
                            onClick={() => setSelectedArtworkId(artwork.id)}
                            className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                              selectedArtworkId === artwork.id
                                ? 'border-[var(--blue)] shadow-md'
                                : 'border-[var(--border)] hover:border-[var(--blue)]'
                            }`}
                          >
                            <div className="aspect-square bg-[var(--surface-3)]">
                              <img
                                src={artwork.imageUrl}
                                alt={artwork.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-3 bg-[var(--surface-3)]">
                              <h4 className="text-sm mb-1 text-[var(--text)]">{artwork.title}</h4>
                              <p className="text-xs text-[var(--text-muted)]">${artwork.price}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {availableArtworks.length > 0 && (
                    <>
                      <div>
                        <label className="block text-sm text-[var(--text-muted)] mb-2">Additional Message (Optional)</label>
                        <textarea
                          rows={4}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          maxLength={500}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                          placeholder="Tell the venue why your artwork would be a great fit..."
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{message.length}/500</p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            setShowApplicationForm(false);
                            setSelectedVenue(null);
                            setSelectedArtworkId('');
                            setMessage('');
                          }}
                          className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSubmitRequest('application')}
                          disabled={!selectedArtworkId || submitting}
                          className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting…' : 'Submit Application'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Waitlist flow */}
                <div className="mb-6 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--yellow)]">
                  <p className="text-sm text-[var(--text)]">
                    <strong>{selectedVenue.name}</strong> is currently full. Join the waitlist and the venue will notify you when a spot opens up.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Message (Optional)</label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                      placeholder="Introduce yourself and your art style…"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{message.length}/500</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowApplicationForm(false);
                        setSelectedVenue(null);
                        setMessage('');
                      }}
                      className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitRequest('waitlist')}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-[var(--yellow)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Joining…' : 'Join Waitlist'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}