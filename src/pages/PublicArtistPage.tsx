import { useEffect, useMemo, useState } from 'react';
import { MapPin, ExternalLink, Instagram, ArrowLeft, Loader2 } from 'lucide-react';
import { apiGet } from '../lib/api';

interface DisplayLocation {
  venueName?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  locality?: string | null;
}

interface ArtworkCardData {
  id: string;
  title: string;
  status: string;
  price: number;
  currency?: string;
  imageUrl?: string | null;
  venueName?: string | null;
  displayLocation?: DisplayLocation | null;
}

interface PublicArtistPageProps {
  slugOrId: string;
}

export function PublicArtistPage({ slugOrId }: PublicArtistPageProps) {
  const [artist, setArtist] = useState<any>(null);
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cityLine = useMemo(() => {
    if (!artist) return '';
    const city = artist.cityPrimary || artist.citySecondary;
    return city || '';
  }, [artist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { artist: a, artworks: arts } = await apiGet<{ artist: any; artworks: any[] }>(`/api/public/artists/${encodeURIComponent(slugOrId)}`);
        if (cancelled) return;
        setArtist(a);
        setArtworks(Array.isArray(arts) ? arts : []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Artist not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  };

  const openArtwork = (artworkId: string) => {
    window.location.href = `/#/purchase-${artworkId}`;
  };

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">Loading artist…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-[var(--text)] font-semibold mb-2">Artist not found</p>
            <p className="text-[var(--text-muted)] text-sm">{error}</p>
          </div>
        )}

        {!loading && artist && (
          <>
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-lg">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)]">
                {artist.profilePhotoUrl ? (
                  <img src={artist.profilePhotoUrl} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-[var(--text-muted)]">
                    {(artist.name || '?').slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-semibold mb-2">{artist.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                    {cityLine && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {cityLine}
                      </span>
                    )}
                    {artist.websiteUrl && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={artist.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" /> Website
                      </a>
                    )}
                    {artist.portfolioUrl && !artist.websiteUrl && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={artist.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" /> Portfolio
                      </a>
                    )}
                    {artist.instagram && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-4 h-4" /> @{artist.instagram.replace('@', '')}
                      </a>
                    )}
                  </div>
                </div>
                {artist.bio && (
                  <p className="text-[var(--text-muted)] leading-relaxed max-w-3xl">{artist.bio}</p>
                )}
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">On Display</h2>
                <span className="text-sm text-[var(--text-muted)]">{artworks.length} artworks</span>
              </div>

              {artworks.length === 0 && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center text-[var(--text-muted)]">
                  No public artworks yet.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {artworks.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => openArtwork(art.id)}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden text-left hover:shadow-lg transition-all group"
                  >
                    <div className="aspect-square bg-[var(--surface-3)] overflow-hidden">
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
                      <div className="text-[var(--text-muted)] text-sm">${art.price.toLocaleString()}</div>
                      {art.displayLocation && art.displayLocation.venueName && (
                        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {art.displayLocation.venueName}
                            {art.displayLocation.locality ? ` · ${art.displayLocation.locality}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
