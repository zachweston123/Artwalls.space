import { useEffect, useState } from 'react';
import { MapPin, Users, X, Image as ImageIcon } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface SimpleArtwork {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  status: string;
}

export function ArtistVenues() {
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [availableArtworks, setAvailableArtworks] = useState<SimpleArtwork[]>([]);
  const [venues, setVenues] = useState<Array<{ id: string; name: string; type?: string | null; city?: string | null; availableSpaces?: number; wallSpaces?: number; imageUrl?: string; address?: string; description?: string }>>([]);

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
        const resp = await apiGet<{ venues: Array<{ id: string; name: string; type?: string | null; city?: string | null }> }>(path);
        const vns = resp?.venues || [];
        const shaped = vns.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type || null,
          city: v.city || null,
          availableSpaces: (v as any).availableSpaces || 0,
          wallSpaces: (v as any).wallSpaces || 0,
          imageUrl: (v as any).coverPhotoUrl || null,
          address: v.city || 'Local area',
          description: (v as any).bio || '',
        }));
        if (mounted) setVenues(shaped);
      } catch {
        if (mounted) setVenues([]);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const handleApply = async () => {
    if (!selectedArtworkId || !selectedVenue) return;
    setSubmitting(true);
    try {
      // Set artwork's venue_id and status to 'pending' to create an application
      const { error } = await supabase
        .from('artworks')
        .update({ venue_id: selectedVenue.id, status: 'pending' })
        .eq('id', selectedArtworkId);
      if (error) throw error;
      // Remove from available list
      setAvailableArtworks(prev => prev.filter(a => a.id !== selectedArtworkId));
      setShowApplicationForm(false);
      setSelectedVenue(null);
      setSelectedArtworkId('');
    } catch (err) {
      console.error('Failed to submit application:', err);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(venues.length ? venues : []).map((venue) => (
          <div key={venue.id} className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow">
            <div className="h-48 bg-[var(--surface-3)] overflow-hidden">
              {venue.imageUrl ? (
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl mb-1">{venue.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{venue.type}</p>
                </div>
                <span className="px-3 py-1 bg-[var(--surface-2)] text-[var(--blue)] border border-[var(--border)] rounded-full text-xs whitespace-nowrap">
                  {venue.availableSpaces} available
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
                  {venue.availableSpaces > 0
                    ? `${venue.availableSpaces} wall space${venue.availableSpaces !== 1 ? 's' : ''} available`
                    : 'No spaces currently available'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Users className="w-4 h-4" />
                  {venue.wallSpaces} wall spaces
                </div>
                <button
                  onClick={() => {
                    setSelectedVenue(venue);
                    setShowApplicationForm(true);
                  }}
                  className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50"
                  disabled={venue.availableSpaces === 0}
                >
                  Apply to Hang
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showApplicationForm && selectedVenue && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl">Apply to {selectedVenue.name}</h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedVenue(null);
                }}
                className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors text-[var(--text)]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                      placeholder="Tell the venue why your artwork would be a great fit..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowApplicationForm(false);
                        setSelectedVenue(null);
                        setSelectedArtworkId('');
                      }}
                      className="flex-1 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!selectedArtworkId || submitting}
                      className="flex-1 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}