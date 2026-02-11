import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapPin, ExternalLink, Instagram, ArrowLeft, Loader2 } from 'lucide-react';
import { apiGet } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/errors';

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

interface DebugInfo {
  routeParam: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
  attempts: string[];
  [key: string]: unknown;
}

interface SupabaseArtworkRow {
  id: string;
  title: string;
  status: string;
  price_cents?: number;
  currency?: string;
  image_url?: string | null;
  venue_id?: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_state?: string | null;
  is_public?: boolean;
  archived_at?: string | null;
}

interface PublicApiResponse {
  artist?: Record<string, unknown>;
  forSale?: SupabaseArtworkRow[];
}

interface PublicArtistPageProps {
  slugOrId: string;
  /** Optional UID hint (auth user id) passed via query param */
  uid?: string | null;
  /** Optional view mode ('public' = preview-as-visitor) */
  viewMode?: string | null;
  onNavigate?: (page: string, params?: Record<string, unknown>) => void;
}

const PUBLIC_STATUSES = ['available', 'active', 'published'];

export function PublicArtistPage({ slugOrId, uid: uidProp, viewMode: viewProp, onNavigate }: PublicArtistPageProps) {
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

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
    const debug: DebugInfo = {
      routeParam: identifier,
      isLoggedIn: !!uid,
      currentUserId: uid,
      attempts: [] as string[],
    };
    try {
      setLoading(true);
      setError(null);

      const decoded = decodeURIComponent(identifier);
      debug.decodedParam = decoded;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);
      debug.isUuid = isUuid;

      let artistRow: Record<string, unknown> | null = null;
      let artworkRows: ArtworkCardData[] = [];
      let resolvedBy = '';

      // ── Attempt 1: Worker API endpoint ──
      try {
        debug.attempts.push('worker-api');
        let apiUrl = `/api/public/artists/${encodeURIComponent(decoded)}`;
        if (uid) apiUrl += `?uid=${encodeURIComponent(uid)}`;
        debug.apiUrl = apiUrl;
        const response = await apiGet<PublicApiResponse>(apiUrl);
        if (response?.artist) {
          artistRow = response.artist as Record<string, unknown>;
          artworkRows = (response.forSale || []) as ArtworkCardData[];
          resolvedBy = 'worker-api';
        }
      } catch (apiErr: unknown) {
        debug.workerError = getErrorMessage(apiErr);
        console.warn('Worker API failed, trying direct Supabase:', getErrorMessage(apiErr));
      }

      // ── Attempt 2: Direct Supabase query (fallback) ──
      if (!artistRow) {
        debug.attempts.push('supabase-direct');
        const selectCols = 'id,slug,name,bio,profile_photo_url,portfolio_url,website_url,instagram_handle,city_primary,city_secondary,art_types,is_public';

        // 2a: Try by id if UUID
        if (isUuid) {
          debug.attempts.push('supabase-by-id');
          const { data, error: err } = await supabase
            .from('artists')
            .select(selectCols)
            .eq('id', decoded)
            .maybeSingle();
          if (err) debug.supabaseIdError = err.message;
          if (data) { artistRow = data; resolvedBy = 'supabase-id'; }
        }

        // 2b: Try by slug
        if (!artistRow) {
          debug.attempts.push('supabase-by-slug');
          const { data, error: err } = await supabase
            .from('artists')
            .select(selectCols)
            .eq('slug', decoded)
            .maybeSingle();
          if (err) debug.supabaseSlugError = err.message;
          if (data) { artistRow = data; resolvedBy = 'supabase-slug'; }
        }

        // 2c: If found via supabase, fetch artworks
        if (artistRow) {
          const { data: awData } = await supabase
            .from('artworks')
            .select('id,title,status,price_cents,currency,image_url,venue_id,venue_name,is_public,archived_at')
            .eq('artist_id', artistRow.id)
            .eq('is_public', true)
            .is('archived_at', null)
            .in('status', PUBLIC_STATUSES)
            .limit(60);
          artworkRows = (awData || []).map((aw: SupabaseArtworkRow) => ({
            id: aw.id,
            title: aw.title,
            status: aw.status,
            priceCents: aw.price_cents || 0,
            currency: aw.currency || 'usd',
            imageUrl: aw.image_url,
            venueName: aw.venue_name || null,
            venueCity: null,
          }));
        }
      }

      // ── Attempt 3: RPC functions (security definer, bypasses RLS) ──
      if (!artistRow) {
        try {
          debug.attempts.push('rpc-resolver');
          const { data: rpcArtist, error: rpcErr } = await supabase.rpc('get_public_artist_profile', { p_identifier: decoded });
          if (!rpcErr && rpcArtist && rpcArtist.length > 0) {
            artistRow = rpcArtist[0];
            resolvedBy = 'rpc';

            const { data: rpcArtworks } = await supabase.rpc('get_public_artist_artworks', { p_identifier: decoded });
            artworkRows = (rpcArtworks || []).map((aw: SupabaseArtworkRow) => ({
              id: aw.id,
              title: aw.title,
              status: aw.status,
              priceCents: aw.price_cents || 0,
              currency: aw.currency || 'usd',
              imageUrl: aw.image_url,
              venueName: aw.venue_name || null,
              venueCity: aw.venue_city ? `${aw.venue_city}${aw.venue_state ? `, ${aw.venue_state}` : ''}` : null,
            }));
          } else if (rpcErr) {
            debug.rpcError = rpcErr.message;
          }
        } catch (rpcErr: unknown) {
          debug.rpcCatchError = getErrorMessage(rpcErr);
        }
      }

      debug.resolvedBy = resolvedBy;
      debug.found = !!artistRow;
      setDebugInfo(debug);

      if (!artistRow) {
        setError('Artist not found');
        setArtist(null);
        setArtworks([]);
        return;
      }

      // Normalize field names (worker returns camelCase, supabase returns snake_case)
      const artistData: ArtistData = {
        id: artistRow.id,
        slug: artistRow.slug ?? artistRow.slug,
        name: artistRow.name ?? artistRow.name ?? 'Artist',
        bio: artistRow.bio ?? artistRow.bio,
        profilePhotoUrl: artistRow.profilePhotoUrl ?? artistRow.profile_photo_url,
        portfolioUrl: artistRow.portfolioUrl ?? artistRow.portfolio_url,
        websiteUrl: artistRow.websiteUrl ?? artistRow.website_url,
        instagramHandle: artistRow.instagramHandle ?? artistRow.instagram_handle,
        cityPrimary: artistRow.cityPrimary ?? artistRow.city_primary,
        citySecondary: artistRow.citySecondary ?? artistRow.city_secondary,
        artTypes: artistRow.artTypes ?? artistRow.art_types ?? [],
      };
      setArtist(artistData);

      // Canonicalize URL: if we resolved by UUID but have a slug, redirect to slug-based URL
      if (artistData.slug && isUuid && typeof window !== 'undefined' && window.location.pathname.startsWith('/artists/')) {
        const canonicalPath = `/artists/${encodeURIComponent(artistData.slug)}`;
        window.history.replaceState({}, '', canonicalPath);
      }

      const cards: ArtworkCardData[] = (artworkRows || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        title: row.title || 'Untitled',
        status: row.status || 'available',
        priceCents: row.priceCents ?? row.price_cents ?? 0,
        currency: row.currency || 'usd',
        imageUrl: row.imageUrl ?? row.image_url,
        venueName: row.venueName ?? row.venue_name ?? null,
        venueCity: (row.venueCity ?? row.venue_city) ? `${row.venueCity ?? row.venue_city}${(row.venueState ?? row.venue_state) ? `, ${row.venueState ?? row.venue_state}` : ''}` : null,
      }));

      setArtworks(cards);
    } catch (e: unknown) {
      console.error('Error loading public artist profile:', e);
      setError(getErrorMessage(e) || 'Unable to load artist profile');
      debug.catchError = getErrorMessage(e);
      setDebugInfo(debug);
    } finally {
      setLoading(false);
    }
  }, [identifier, uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = () => {
    // Clear /artists/ URL first so the useEffect in App.tsx doesn't
    // re-force us back to public-artist-profile
    window.history.replaceState({}, '', '/');
    if (window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate('artist-profile');
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
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-[var(--text)] mb-1">{artist.name}</h1>
                {artist.slug && <p className="text-sm text-[var(--text-muted)] mb-3">@{artist.slug}</p>}
                
                {cityLine && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{cityLine}</span>
                  </div>
                )}

                {artist.bio && <p className="text-[var(--text)] mb-4">{artist.bio}</p>}

                {artist.artTypes && artist.artTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {artist.artTypes.map((type) => (
                      <span key={type} className="px-3 py-1 bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)] rounded-full text-xs font-medium">
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {artist.websiteUrl && (
                    <a href={artist.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--blue)] hover:underline">
                      <ExternalLink className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  {artist.instagramHandle && (
                    <a href={`https://instagram.com/${artist.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--blue)] hover:underline">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {/* Artworks */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-[var(--text)] mb-6">On Display</h2>
              {artworks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {artworks.map(artwork => (
                    <div key={artwork.id} onClick={() => openArtwork(artwork.id)} className="cursor-pointer group bg-[var(--surface-2)] rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--blue)] transition-all duration-300 shadow-md hover:shadow-xl">
                      <div className="w-full h-48 bg-[var(--surface-3)] overflow-hidden">
                        {artwork.imageUrl && <img src={artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-[var(--text)] truncate">{artwork.title}</h3>
                        {artwork.venueName && <p className="text-sm text-[var(--text-muted)] truncate">{artwork.venueName}</p>}
                        {artwork.venueCity && <p className="text-xs text-[var(--text-muted)] truncate">{artwork.venueCity}</p>}
                        <p className="text-sm font-bold text-[var(--text)] mt-2">{fmtPrice(artwork.priceCents)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--surface-2)] border border-dashed border-[var(--border)] rounded-lg">
                  <p className="text-[var(--text-muted)]">No works currently on display.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-lg z-50">
          <details>
            <summary className="cursor-pointer font-bold">Debug Info</summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
