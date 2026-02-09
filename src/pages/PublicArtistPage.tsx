import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapPin, ExternalLink, Instagram, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ArtworkCardData = {
  id: string;
  title: string;
  status: string;
  priceCents: number;
  currency?: string;
  imageUrl?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
};

interface ArtistData {
  id: string;
  slug?: string | null;
  name: string;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  cityPrimary?: string | null;
  citySecondary?: string | null;
  artTypes?: string[] | null;
}

interface PublicArtistPageProps {
  slugOrId: string;
  /** Optional UID hint (auth user id) passed via query param */
  uid?: string | null;
  /** Optional view mode ('public' = preview-as-visitor) */
  viewMode?: string | null;
  onNavigate?: (page: string, params?: any) => void;
}

const PUBLIC_STATUSES = ['available', 'active', 'published'];

export function PublicArtistPage({ slugOrId, uid: uidProp, viewMode: viewProp, onNavigate }: PublicArtistPageProps) {
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive the identifier to look up — prefer props, fall back to URL.
  const { identifier, uid, view } = useMemo(() => {
    if (uidProp !== undefined || viewProp !== undefined) {
      return { identifier: slugOrId, uid: uidProp ?? null, view: viewProp ?? null };
    }
    try {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const pathParts = url.pathname.split('/').filter(Boolean);
      return {
        identifier: pathParts[1] || slugOrId,
        uid: params.get('uid'),
        view: params.get('view'),
      };
    } catch {
      return { identifier: slugOrId, uid: null, view: null };
    }
  }, [slugOrId, uidProp, viewProp]);

  const isPublicView = view === 'public';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const decoded = decodeURIComponent(identifier);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);

      // 1. Find the artist row — by id or slug
      let artistRow: any = null;

      if (isUuid) {
        const { data } = await supabase
          .from('artists')
          .select('id, slug, name, bio, profile_photo_url, portfolio_url, website_url, instagram_handle, city_primary, city_secondary, art_types')
          .eq('id', decoded)
          .maybeSingle();
        artistRow = data;
      } else {
        const { data } = await supabase
          .from('artists')
          .select('id, slug, name, bio, profile_photo_url, portfolio_url, website_url, instagram_handle, city_primary, city_secondary, art_types')
          .eq('slug', decoded)
          .maybeSingle();
        artistRow = data;
      }

      // Fallback: try uid if primary lookup failed
      if (!artistRow && uid) {
        const { data } = await supabase
          .from('artists')
          .select('id, slug, name, bio, profile_photo_url, portfolio_url, website_url, instagram_handle, city_primary, city_secondary, art_types')
          .eq('id', uid)
          .maybeSingle();
        artistRow = data;
      }

      if (!artistRow) {
        setError('Artist not found');
        setArtist(null);
        setArtworks([]);
        return;
      }

      const artistData: ArtistData = {
        id: artistRow.id,
        slug: artistRow.slug,
        name: artistRow.name || 'Artist',
        bio: artistRow.bio,
        profilePhotoUrl: artistRow.profile_photo_url,
        portfolioUrl: artistRow.portfolio_url,
        websiteUrl: artistRow.website_url,
        instagramHandle: artistRow.instagram_handle,
        cityPrimary: artistRow.city_primary,
        citySecondary: artistRow.city_secondary,
        artTypes: artistRow.art_types,
      };
      setArtist(artistData);

      // 2. Fetch public artworks for this artist
      const { data: artworkRows, error: artErr } = await supabase
        .from('artworks')
        .select('id, title, status, price_cents, currency, image_url, venue_id, venue_name, venue:venues(name, city, state)')
        .eq('artist_id', artistRow.id)
        .eq('is_public', true)
        .is('archived_at', null)
        .in('status', PUBLIC_STATUSES)
        .order('published_at', { ascending: false })
        .limit(60);

      if (artErr) {
        console.warn('Artworks query error:', artErr.message);
      }

      const cards: ArtworkCardData[] = (artworkRows || []).map((row: any) => {
        const venue = row.venue as any;
        return {
          id: row.id,
          title: row.title || 'Untitled',
          status: row.status || 'available',
          priceCents: row.price_cents || 0,
          currency: row.currency || 'usd',
          imageUrl: row.image_url,
          venueName: venue?.name || row.venue_name || null,
          venueCity: venue?.city ? `${venue.city}${venue.state ? `, ${venue.state}` : ''}` : null,
        };
      });

      setArtworks(cards);
    } catch (e: any) {
      setError(e?.message || 'Unable to load artist profile');
    } finally {
      setLoading(false);
    }
  }, [identifier, uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('artist-profile');
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const openArtwork = (artworkId: string) => {
    if (onNavigate) {
      onNavigate(`purchase-${artworkId}`);
    } else {
      window.location.href = `/#/purchase-${artworkId}`;
    }
  };

  const cityLine = artist?.cityPrimary || artist?.citySecondary || '';

  const fmtPrice = (cents: number) => {
    const dollars = cents / 100;
    return '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="text-[var(--text)]">
      {/* Back button (hidden in preview-as-visitor mode) */}
      {!isPublicView && (
        <div className="max-w-5xl mx-auto py-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">Loading artist…</p>
          </div>
        )}

        {/* Not Found */}
        {!loading && error && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-[var(--text)] font-semibold mb-2">Artist not found</p>
            <p className="text-[var(--text-muted)] text-sm mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Artist Profile */}
        {!loading && artist && (
          <>
            {/* Header card */}
            <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-lg">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)] flex-shrink-0">
                {artist.profilePhotoUrl ? (
                  <img src={artist.profilePhotoUrl} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-[var(--text-muted)]">
                    {(artist.name || '?').slice(0, 1).toUpperCase()}
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
                    {artist.instagramHandle && (
                      <a
                        className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        href={`https://instagram.com/${String(artist.instagramHandle).replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="w-4 h-4" /> @{String(artist.instagramHandle).replace('@', '')}
                      </a>
                    )}
                  </div>
                </div>
                {artist.artTypes && artist.artTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {artist.artTypes.map((t) => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {artist.bio && (
                  <p className="text-[var(--text-muted)] leading-relaxed max-w-3xl">{artist.bio}</p>
                )}
              </div>
            </div>

            {/* Artworks section */}
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-1">Works on Display</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6">Currently available for purchase at venues.</p>

              {artworks.length === 0 ? (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-10 text-center">
                  <p className="text-[var(--text-muted)]">No works currently on display.</p>
                </div>
              ) : (
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
                        <div className="text-[var(--text-muted)] text-sm">{fmtPrice(art.priceCents)}</div>
                        {art.venueName && (
                          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{art.venueName}{art.venueCity ? ` · ${art.venueCity}` : ''}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <span className="text-xs font-semibold text-[var(--blue)]">View Artwork →</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
