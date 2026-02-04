import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Sparkles } from 'lucide-react';
import { apiGet } from '../lib/api';

interface DisplayVenue {
  id?: string;
  name?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  slug?: string | null;
}

interface ArtworkCardData {
  id: string;
  title: string;
  status: string;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  artistName?: string | null;
}

interface SetItem {
  artwork: ArtworkCardData;
  displayVenues: DisplayVenue[];
}

interface ArtistProfileSummary {
  id: string;
  name: string;
  slug?: string | null;
  profilePhotoUrl?: string | null;
}

interface SetDetail {
  id: string;
  title: string;
  description?: string | null;
  heroImageUrl?: string | null;
  pieceCount: number;
  items: SetItem[];
  artistId?: string;
}

interface PublicArtistSetPageProps {
  slugOrId: string;
  setId: string;
}

export function PublicArtistSetPage({ slugOrId, setId }: PublicArtistSetPageProps) {
  const [artist, setArtist] = useState<ArtistProfileSummary | null>(null);
  const [setDetail, setSetDetail] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allDisplayVenues = useMemo(() => {
    const map = new Map<string, DisplayVenue>();
    (setDetail?.items || []).forEach((item) => {
      (item.displayVenues || []).forEach((v) => {
        const key = v.id || v.slug || v.name || crypto.randomUUID();
        if (!map.has(key)) map.set(key, v);
      });
    });
    return Array.from(map.values());
  }, [setDetail?.items]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const setPayload = await apiGet<any>(`/api/public/sets/${encodeURIComponent(setId)}`);
        if (cancelled) return;

        const nextSet: SetDetail | null = setPayload?.set || setPayload || null;
        if (!nextSet) throw new Error('Set not found');
        setSetDetail(nextSet);

        try {
          const artistPayload = await apiGet<any>(`/api/public/artists/${encodeURIComponent(slugOrId)}`);
          if (!cancelled) setArtist(artistPayload?.artist || artistPayload || null);
        } catch (artistErr) {
          console.warn('Failed to load artist for set', artistErr);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Unable to load set');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setId, slugOrId]);

  const handleBack = () => {
    const fallback = `/artists/${artist?.slug || artist?.id || slugOrId}`;
    if (window.history.length > 1) window.history.back();
    else window.location.href = fallback;
  };

  const openArtwork = (artworkId: string) => {
    window.location.href = `/#/purchase-${artworkId}`;
  };

  const renderArtworkCard = (item: SetItem) => {
    const art = item.artwork;
    const price = Number(art.price ?? 0);
    const venueNames = (item.displayVenues || []).map((v) => v.name).filter(Boolean);
    return (
      <button
        key={art.id}
        onClick={() => openArtwork(art.id)}
        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden text-left hover:shadow-lg transition-all group"
      >
        <div className="aspect-[4/3] bg-[var(--surface-3)] overflow-hidden">
          {art.imageUrl ? (
            <img
              src={art.imageUrl}
              alt={art.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate group-hover:text-[var(--text)]">{art.title}</h3>
            <span className="text-xs px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]">
              {art.status === 'sold' ? 'Sold' : 'Available'}
            </span>
          </div>
          <div className="text-[var(--text-muted)] text-sm">${price.toLocaleString()}</div>
          {venueNames.length > 0 && (
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">On display at {venueNames.join(', ')}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const emptyCard = (message: string) => (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-muted)]">
      {message}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-2)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-lg font-semibold tracking-tight">Artwalls</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">Loading set…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-[var(--text)] font-semibold mb-2">Set not found</p>
            <p className="text-[var(--text-muted)] text-sm">{error}</p>
          </div>
        )}

        {!loading && setDetail && (
          <>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
              <div className="aspect-[16/7] bg-[var(--surface-3)]">
                {setDetail.heroImageUrl ? (
                  <img src={setDetail.heroImageUrl} alt={setDetail.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">No image</div>
                )}
              </div>
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Set</p>
                    <h1 className="text-3xl font-semibold text-[var(--text)]">{setDetail.title}</h1>
                    {artist && <p className="text-sm text-[var(--text-muted)] mt-1">by {artist.name}</p>}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">{setDetail.pieceCount} pieces</div>
                </div>
                {setDetail.description && (
                  <p className="text-[var(--text-muted)] leading-relaxed">{setDetail.description}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => (window.location.href = `/artists/${artist?.slug || artist?.id || slugOrId}`)}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-sm text-[var(--text)] hover:bg-[var(--surface-1)] transition"
                  >
                    View artist profile
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] text-sm text-[var(--text)] hover:bg-[var(--surface-1)] transition"
                  >
                    Browse artworks
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Artworks in this set</span>
              </div>
              {setDetail.items.length === 0 && emptyCard('No artworks in this set yet.')}
              {setDetail.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {setDetail.items.map((item) => renderArtworkCard(item))}
                </div>
              )}
            </div>

            {allDisplayVenues.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>Where to see this set</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allDisplayVenues.map((venue) => (
                    <div key={venue.id || venue.slug || venue.name} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--surface-2)]">
                      <p className="font-semibold text-[var(--text)]">{venue.name || 'Venue'}</p>
                      {(venue.city || venue.neighborhood) && (
                        <p className="text-xs text-[var(--text-muted)]">{venue.neighborhood || venue.city}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
