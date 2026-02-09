/**
 * PublicArtistProfilePage – /p/artist/:slug
 *
 * A fully standalone, read-only public artist profile (Instagram/Marketplace
 * style).  Rendered OUTSIDE every auth guard, dashboard layout, or sidebar.
 *
 * Data is fetched via SECURITY DEFINER RPCs so anon (logged-out) visitors
 * can see public artist info without hitting RLS walls.
 */

import { useEffect, useState, useCallback } from 'react';
import { MapPin, ExternalLink, Instagram, Loader2, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiGet } from '../../lib/api';

// ── Types ────────────────────────────────────────────────────

interface ArtistData {
  id: string;
  slug: string | null;
  name: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  cityPrimary: string | null;
  citySecondary: string | null;
  artTypes: string[];
}

interface ArtworkCard {
  id: string;
  title: string;
  status: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
}

interface Props {
  slug: string;
}

// ── Helpers ──────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

// ── Component ────────────────────────────────────────────────

export function PublicArtistProfilePage({ slug }: Props) {
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [artworks, setArtworks] = useState<ArtworkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null);

  const loadProfile = useCallback(async () => {
    const debugLog: Record<string, unknown> = { slug, attempts: [] as string[] };
    try {
      setLoading(true);
      setError(null);

      const decoded = decodeURIComponent(slug);
      debugLog.decoded = decoded;

      let artistData: ArtistData | null = null;
      let artworkCards: ArtworkCard[] = [];

      // ── Attempt 1: Worker API (most reliable — uses service-role key, no migration needed) ──
      try {
        (debugLog.attempts as string[]).push('worker:/api/public/artists/');
        // apiGet uses the correct API_BASE (localhost:4242 in dev, origin in prod)
        const payload = await apiGet<any>(`/api/public/artists/${encodeURIComponent(decoded)}`);
        const a = payload?.artist || payload;
        if (a && a.id) {
          debugLog.resolvedVia = 'worker-api';
          artistData = {
            id: a.id,
            slug: a.slug ?? null,
            name: a.name ?? 'Artist',
            bio: a.bio ?? null,
            profilePhotoUrl: a.profilePhotoUrl ?? a.profile_photo_url ?? null,
            portfolioUrl: a.portfolioUrl ?? a.portfolio_url ?? null,
            websiteUrl: a.websiteUrl ?? a.website_url ?? null,
            instagramHandle: a.instagramHandle ?? a.instagram_handle ?? null,
            cityPrimary: a.cityPrimary ?? a.city_primary ?? null,
            citySecondary: a.citySecondary ?? a.city_secondary ?? null,
            artTypes: a.artTypes ?? a.art_types ?? [],
          };
          // Worker returns artworks under "forSale", not "artworks"
          const rawArtworks = payload.forSale ?? payload.artworks ?? [];
          artworkCards = rawArtworks.map((aw: any) => ({
            id: aw.id,
            title: aw.title ?? 'Untitled',
            status: aw.status ?? 'available',
            priceCents: aw.priceCents ?? aw.price_cents ?? 0,
            currency: aw.currency ?? 'usd',
            imageUrl: aw.imageUrl ?? aw.image_url ?? null,
            venueName: aw.venueName ?? aw.venue_name ?? aw.display?.venueName ?? null,
            venueCity: aw.venueCity ?? aw.venue_city ?? null,
            venueState: aw.venueState ?? aw.venue_state ?? null,
          }));
        }
      } catch (apiErr: any) {
        debugLog.workerError = apiErr?.message;
        console.warn('[PublicArtistProfilePage] Worker API failed:', apiErr?.message);
      }

      // ── Attempt 2: RPC functions (SECURITY DEFINER, bypasses RLS — requires migration) ──
      if (!artistData) {
        try {
          (debugLog.attempts as string[]).push('rpc:get_public_artist_profile');
          const { data: profileRows, error: profileErr } = await supabase
            .rpc('get_public_artist_profile', { p_identifier: decoded });

          if (profileErr) throw profileErr;

          const row = Array.isArray(profileRows) ? profileRows[0] : profileRows;
          if (row) {
            debugLog.resolvedVia = 'rpc';
            artistData = {
              id: row.id,
              slug: row.slug ?? null,
              name: row.name ?? 'Artist',
              bio: row.bio ?? null,
              profilePhotoUrl: row.profile_photo_url ?? null,
              portfolioUrl: row.portfolio_url ?? null,
              websiteUrl: row.website_url ?? null,
              instagramHandle: row.instagram_handle ?? null,
              cityPrimary: row.city_primary ?? null,
              citySecondary: row.city_secondary ?? null,
              artTypes: row.art_types ?? [],
            };

            // Fetch artworks via RPC
            (debugLog.attempts as string[]).push('rpc:get_public_artist_artworks');
            const { data: awRows } = await supabase
              .rpc('get_public_artist_artworks', { p_identifier: decoded });

            artworkCards = (awRows ?? []).map((aw: any) => ({
              id: aw.id,
              title: aw.title ?? 'Untitled',
              status: aw.status ?? 'available',
              priceCents: aw.price_cents ?? 0,
              currency: aw.currency ?? 'usd',
              imageUrl: aw.image_url ?? null,
              venueName: aw.venue_name ?? null,
              venueCity: aw.venue_city ?? null,
              venueState: aw.venue_state ?? null,
            }));
          }
        } catch (rpcErr: any) {
          debugLog.rpcError = rpcErr?.message;
          console.warn('[PublicArtistProfilePage] RPC failed:', rpcErr?.message);
        }
      }

      // ── Attempt 3: Direct Supabase query (relies on RLS policy) ──
      if (!artistData) {
        try {
          (debugLog.attempts as string[]).push('direct:supabase-select');

          // Use select('*') so the query works regardless of which optional
          // columns (slug, is_public, art_types) exist in the table.
          // The identifier from the URL is a UUID in this case.
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);

          let rows: any[] | null = null;

          if (isUuid) {
            // Direct id lookup — always works
            const res = await supabase
              .from('artists')
              .select('*')
              .eq('id', decoded)
              .limit(1);
            if (res.error) debugLog.directIdError = res.error.message;
            rows = res.data;
          } else {
            // Try slug, but slug column may not exist
            const slugRes = await supabase
              .from('artists')
              .select('*')
              .eq('slug', decoded)
              .limit(1);
            if (slugRes.error) {
              debugLog.directSlugError = slugRes.error.message;
              // slug column doesn't exist — try name match as last resort
              const nameRes = await supabase
                .from('artists')
                .select('*')
                .ilike('name', decoded)
                .limit(1);
              if (nameRes.error) debugLog.directNameError = nameRes.error.message;
              rows = nameRes.data;
            } else {
              rows = slugRes.data;
            }
          }

          const row = rows?.[0];
          if (row) {
            debugLog.resolvedVia = 'direct-query';
            artistData = {
              id: row.id,
              slug: row.slug ?? null,
              name: row.name ?? 'Artist',
              bio: row.bio ?? null,
              profilePhotoUrl: row.profile_photo_url ?? null,
              portfolioUrl: row.portfolio_url ?? null,
              websiteUrl: row.website_url ?? null,
              instagramHandle: row.instagram_handle ?? null,
              cityPrimary: row.city_primary ?? null,
              citySecondary: row.city_secondary ?? null,
              artTypes: row.art_types ?? [],
            };

            const { data: awRows } = await supabase
              .from('artworks')
              .select('*')
              .eq('artist_id', row.id)
              .in('status', ['available', 'active', 'published'])
              .is('archived_at', null);

            artworkCards = (awRows ?? []).map((aw: any) => ({
              id: aw.id,
              title: aw.title ?? 'Untitled',
              status: aw.status ?? 'available',
              priceCents: aw.price_cents ?? 0,
              currency: aw.currency ?? 'usd',
              imageUrl: aw.image_url ?? null,
              venueName: null,
              venueCity: null,
              venueState: null,
            }));
          }
        } catch (directErr: any) {
          debugLog.directError = directErr?.message;
        }
      }

      if (!artistData) {
        debugLog.found = false;
        setError('Artist not found');
        return;
      }

      debugLog.found = true;
      debugLog.resolvedId = artistData.id;
      setArtist(artistData);
      setArtworks(artworkCards);

      // Canonicalize URL → prefer slug over UUID
      if (artistData.slug && decoded !== artistData.slug) {
        window.history.replaceState({}, '', `/p/artist/${encodeURIComponent(artistData.slug)}`);
      }

      // Check auth status for debug panel
      const { data: sessionData } = await supabase.auth.getSession();
      debugLog.session = sessionData?.session ? 'authenticated' : 'anon';
    } catch (e: any) {
      console.error('[PublicArtistProfilePage]', e);
      if (!error) setError(e?.message ?? 'Failed to load profile');
      debugLog.error = e?.message;
    } finally {
      setLoading(false);
      setDebug(debugLog);
    }
  }, [slug]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ── City line helper ──
  const cityLine = artist?.cityPrimary
    ? artist.citySecondary
      ? `${artist.cityPrimary} · ${artist.citySecondary}`
      : artist.cityPrimary
    : artist?.citySecondary ?? '';

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Minimal public header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-[var(--text)] hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-[var(--accent-contrast)]" />
            </div>
            <span className="text-lg font-semibold">Artwalls</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">Loading artist…</p>
          </div>
        )}

        {/* Error / Not Found */}
        {!loading && error && (
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-10 text-center max-w-md mx-auto">
            <p className="text-[var(--text)] font-semibold text-lg mb-2">Artist not found</p>
            <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
            {debug && (
              <details className="text-left mb-6">
                <summary className="text-xs text-[var(--text-muted)] cursor-pointer">Debug info</summary>
                <pre className="mt-2 text-xs text-[var(--text-muted)] bg-[var(--surface-3)] p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap break-all">
                  {JSON.stringify(debug, null, 2)}
                </pre>
              </details>
            )}
            <a
              href="/"
              className="inline-block px-5 py-2.5 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] font-semibold text-sm rounded-lg transition-colors"
            >
              Go Home
            </a>
          </div>
        )}

        {/* ── Artist Profile ── */}
        {!loading && artist && (
          <>
            {/* Header card */}
            <section className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-lg">
              {/* Avatar */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)] flex-shrink-0 mx-auto sm:mx-0">
                {artist.profilePhotoUrl ? (
                  <img src={artist.profilePhotoUrl} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-muted)]">
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-[var(--text)] mb-1">{artist.name}</h1>
                {artist.slug && (
                  <p className="text-sm text-[var(--text-muted)] mb-3">@{artist.slug}</p>
                )}

                {cityLine && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-[var(--text-muted)] mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{cityLine}</span>
                  </div>
                )}

                {artist.bio && (
                  <p className="text-[var(--text)] mb-4 whitespace-pre-line">{artist.bio}</p>
                )}

                {/* Art type tags */}
                {artist.artTypes.length > 0 && (
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                    {artist.artTypes.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1 bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)] rounded-full text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Links */}
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  {artist.websiteUrl && (
                    <a
                      href={artist.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--blue)] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Website
                    </a>
                  )}
                  {artist.portfolioUrl && artist.portfolioUrl !== artist.websiteUrl && (
                    <a
                      href={artist.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--blue)] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Portfolio
                    </a>
                  )}
                  {artist.instagramHandle && (
                    <a
                      href={`https://instagram.com/${artist.instagramHandle.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[var(--blue)] hover:underline"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* ── On Display Now ── */}
            <section className="mt-12">
              <h2 className="text-2xl font-bold text-[var(--text)] mb-6">On Display Now</h2>

              {artworks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {artworks.map((aw) => (
                    <a
                      key={aw.id}
                      href={`/#/purchase-${aw.id}`}
                      className="group bg-[var(--surface-2)] rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--blue)] transition-all duration-300 shadow-md hover:shadow-xl"
                    >
                      <div className="w-full aspect-[4/3] bg-[var(--surface-3)] overflow-hidden">
                        {aw.imageUrl ? (
                          <img
                            src={aw.imageUrl}
                            alt={aw.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-[var(--text)] truncate">{aw.title}</h3>
                        {aw.venueName && (
                          <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">{aw.venueName}</p>
                        )}
                        {aw.venueCity && (
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {aw.venueCity}{aw.venueState ? `, ${aw.venueState}` : ''}
                          </p>
                        )}
                        {aw.priceCents > 0 && (
                          <p className="text-sm font-bold text-[var(--text)] mt-2">
                            {fmtPrice(aw.priceCents)}
                          </p>
                        )}
                        <span className="inline-block mt-2 text-xs font-medium text-[var(--blue)] group-hover:underline">
                          View Artwork →
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-14 bg-[var(--surface-2)] border border-dashed border-[var(--border)] rounded-lg">
                  <p className="text-[var(--text-muted)]">No works currently on display.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Minimal public footer */}
      <footer className="border-t border-[var(--border)] mt-16 bg-[var(--surface-1)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center">
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            Powered by Artwalls
          </a>
        </div>
      </footer>

      {/* Dev-only debug panel */}
      {isDev && debug && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-green-300 p-4 rounded-lg shadow-2xl max-w-sm z-[9999] text-xs font-mono">
          <details>
            <summary className="cursor-pointer font-bold text-green-400 mb-1">
              🐛 Public Profile Debug
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all max-h-60 overflow-auto">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
