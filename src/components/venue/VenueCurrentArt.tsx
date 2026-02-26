import { useState, useEffect } from 'react';
import { QrCode, MapPin, Calendar, X } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface InstalledArtwork {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  price: number;
  wallSpaceId: string;
  wallSpaceName: string;
  installDate: string;
  endDate: string;
  status: 'active' | 'sold' | 'ending-soon' | 'needs-pickup' | 'ended';
}

export function VenueCurrentArt() {
  const [artworks, setArtworks] = useState<InstalledArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'ending-soon' | 'needs-pickup'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ id: string; action: string } | null>(null);
  const [qrArtwork, setQrArtwork] = useState<InstalledArtwork | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCurrentArt() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const venueId = authData?.user?.id;
        if (!venueId) { setLoading(false); return; }

        // Get all artworks installed at this venue (active, sold, etc.)
        const { data: artworkRows } = await supabase
          .from('artworks')
          .select('id, title, image_url, price, status, artist_id, venue_id, created_at')
          .eq('venue_id', venueId)
          .in('status', ['active', 'sold'])
          .order('created_at', { ascending: false });

        const rows = artworkRows || [];
        const artistIds = [...new Set(rows.map((a: any) => a.artist_id).filter(Boolean))];
        let artistMap: Record<string, string> = {};
        if (artistIds.length > 0) {
          const { data: artists } = await supabase.from('artists').select('id, name').in('id', artistIds);
          for (const ar of (artists || [])) artistMap[ar.id] = ar.name || 'Unknown Artist';
        }

        // Get wallspace assignments
        const artworkIds = rows.map((a: any) => a.id);
        let wallMap: Record<string, string> = {};
        if (artworkIds.length > 0) {
          const { data: walls } = await supabase
            .from('wallspaces')
            .select('id, name, current_artwork_id')
            .eq('venue_id', venueId)
            .in('current_artwork_id', artworkIds);
          for (const w of (walls || [])) {
            if (w.current_artwork_id) wallMap[w.current_artwork_id] = w.name || 'Wall Space';
          }
        }

        const mapped: InstalledArtwork[] = rows.map((a: any) => ({
          id: a.id,
          artworkId: a.id,
          artworkTitle: a.title || 'Untitled',
          artworkImage: a.image_url || '',
          artistName: artistMap[a.artist_id] || 'Unknown Artist',
          price: (a.price || 0) / 100,
          wallSpaceId: '',
          wallSpaceName: wallMap[a.id] || 'Unassigned',
          installDate: a.created_at || new Date().toISOString(),
          endDate: new Date(new Date(a.created_at || Date.now()).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: a.status === 'sold' ? 'sold' : 'active',
        }));
        if (mounted) setArtworks(mapped);
      } catch {
        if (mounted) setArtworks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCurrentArt();
    return () => { mounted = false; };
  }, []);

  const filteredArtworks = artworks.filter(artwork => {
    if (filter === 'all') return true;
    return artwork.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { bg: 'bg-[var(--green-muted)]', text: 'text-[var(--green)]', label: 'Active' },
      sold: { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--blue)]', label: 'Sold' },
      'ending-soon': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--warning)]', label: 'Ending Soon' },
      'needs-pickup': { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--warning)]', label: 'Needs Pickup' },
      ended: { bg: 'bg-[var(--surface-2)]', text: 'text-[var(--text-muted)]', label: 'Ended' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`px-3 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const handleAction = (id: string, action: string) => {
    setSelectedAction({ id, action });
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    if (!selectedAction) return;
    
    setArtworks(artworks.map(artwork => {
      if (artwork.id === selectedAction.id) {
        switch (selectedAction.action) {
          case 'mark-sold':
            return { ...artwork, status: 'sold' as const };
          case 'confirm-pickup':
            return { ...artwork, status: 'ended' as const };
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'mark-sold': return 'Mark as Sold';
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
        <h1 className="text-3xl mb-2">Current Artwork</h1>
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
                    <h3 className="text-xl mb-1">{artwork.artworkTitle}</h3>
                    <p className="text-[var(--text-muted)]">by {artwork.artistName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(artwork.status)}
                    <span className="text-lg">${artwork.price}</span>
                  </div>
                </div>

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
                      <button className="text-[var(--green)] hover:opacity-80 transition-opacity underline" onClick={() => setQrArtwork(artwork)}>
                        View / Print
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {artwork.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity text-sm"
                      >
                        Mark as Sold
                      </button>
                      <button
                        onClick={() => handleAction(artwork.id, 'end-display')}
                        className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors text-sm"
                      >
                        End Display
                      </button>
                    </>
                  )}
                  {artwork.status === 'sold' && (
                    <button
                      onClick={() => handleAction(artwork.id, 'confirm-pickup')}
                      className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      Confirm Pickup Completed
                    </button>
                  )}
                  {artwork.status === 'ending-soon' && (
                    <>
                      <button
                        onClick={() => handleAction(artwork.id, 'mark-sold')}
                        className="px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity text-sm"
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
              <h3 className="text-xl mb-2">No artwork on display yet</h3>
              <p className="text-[var(--text-muted)] mb-6">
                Review artist applications to start displaying artwork.
              </p>
              <button className="px-6 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity">
                View Applications
              </button>
            </>
          )}
          {filter !== 'all' && (
            <>
              <h3 className="text-xl mb-2">No {filter.replace('-', ' ')} artwork yet</h3>
              <p className="text-[var(--text-muted)]">Try selecting a different filter.</p>
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">Confirm Action</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                aria-label="Close dialog"
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
                className="flex-1 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
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
          <div className="bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">Artwork QR Code</h3>
              <button onClick={() => setQrArtwork(null)} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors" aria-label="Close dialog">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[var(--text-muted)]">Use this QR for customer purchase and info.</p>
              <div className="flex items-center justify-center">
                <img
                  src={`${API_BASE}/api/artworks/${qrArtwork.id}/qrcode.svg?w=240`}
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
