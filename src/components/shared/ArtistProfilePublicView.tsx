/**
 * ArtistProfilePublicView – shared, read-only artist profile display.
 *
 * Renders the SAME visual system as the in-app ArtistProfile component
 * (surface-1/2 cards, same typography scale, same layout primitives)
 * but in read-only mode.
 *
 * Used by:
 *  • PublicArtistProfilePage  → variant="full"   (header card + artwork grid)
 *  • PurchasePage             → variant="compact" ("About the artist" card)
 */

import { MapPin } from 'lucide-react';
import { SocialLinks } from './SocialLinks';

// ── Shared artist-data shape (camelCase, already normalised) ─

export interface ArtistPublicData {
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
  artTypes?: string[];
}

// ── Props ────────────────────────────────────────────────────

interface FullProps {
  artist: ArtistPublicData;
  variant: 'full';
}

interface CompactProps {
  artist: ArtistPublicData;
  variant: 'compact';
  /** SPA navigation (no new tab) to the artist's public profile */
  onViewProfile?: () => void;
}

type ArtistProfilePublicViewProps = FullProps | CompactProps;

// ── Helpers ──────────────────────────────────────────────────

function cityLine(a: ArtistPublicData): string {
  if (a.cityPrimary && a.citySecondary) return `${a.cityPrimary} · ${a.citySecondary}`;
  return a.cityPrimary ?? a.citySecondary ?? '';
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ── Component ────────────────────────────────────────────────

export function ArtistProfilePublicView(props: ArtistProfilePublicViewProps) {
  const { artist, variant } = props;

  // ── Compact variant (Purchase page "About the artist") ──────
  if (variant === 'compact') {
    const onViewProfile = (props as CompactProps).onViewProfile;

    return (
      <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 border border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">About the artist</h2>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button
            type="button"
            onClick={onViewProfile}
            className="w-14 h-14 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] flex-shrink-0 hover:ring-2 hover:ring-[var(--blue)] transition-all cursor-pointer"
          >
            {artist.profilePhotoUrl ? (
              <img
                src={artist.profilePhotoUrl}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                {initials(artist.name)}
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* Name (clickable, SPA nav) */}
            <button
              type="button"
              onClick={onViewProfile}
              className="text-sm text-[var(--text)] font-semibold hover:text-[var(--blue)] hover:underline transition-colors cursor-pointer text-left"
            >
              {artist.name}
            </button>

            {/* City */}
            {cityLine(artist) && (
              <p className="text-xs text-[var(--text-muted)]">Based in {cityLine(artist)}</p>
            )}

            {/* Bio */}
            <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-3">
              {artist.bio || 'Learn more about the artist behind this piece.'}
            </p>

            {/* Links row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {onViewProfile && (
                <button
                  type="button"
                  onClick={onViewProfile}
                  className="text-xs text-[var(--accent)] underline"
                >
                  View artist profile
                </button>
              )}

              <SocialLinks
                instagramHandle={artist.instagramHandle}
                portfolioUrl={artist.portfolioUrl}
                websiteUrl={artist.websiteUrl}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full variant (Public profile header card) ───────────────

  return (
    <section className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
        {/* Avatar – matches in-app profile (w-20 h-20) */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex-shrink-0 mx-auto sm:mx-0">
          {artist.profilePhotoUrl ? (
            <img
              src={artist.profilePhotoUrl}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-muted)]">
              {initials(artist.name)}
            </div>
          )}
        </div>

        {/* Info block */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl mb-1 text-[var(--text)]">{artist.name}</h1>
          {artist.slug && (
            <p className="text-sm text-[var(--text-muted)] mb-3">@{artist.slug}</p>
          )}

          {cityLine(artist) && (
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-[var(--text-muted)] mb-3">
              <MapPin className="w-4 h-4" />
              <span>{cityLine(artist)}</span>
            </div>
          )}

          {artist.bio && (
            <p className="text-[var(--text)] mb-4 whitespace-pre-line">{artist.bio}</p>
          )}

          {/* Art type tags – same pills as in-app profile */}
          {artist.artTypes && artist.artTypes.length > 0 && (
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
              {artist.artTypes.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 bg-[var(--blue-muted)] text-[var(--blue)] text-sm rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Social links (deduplicated) */}
          <SocialLinks
            instagramHandle={artist.instagramHandle}
            portfolioUrl={artist.portfolioUrl}
            websiteUrl={artist.websiteUrl}
            className="justify-center sm:justify-start"
          />
        </div>
      </div>
    </section>
  );
}
