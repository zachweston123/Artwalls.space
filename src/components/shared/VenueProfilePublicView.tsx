/**
 * VenueProfilePublicView – shared, read-only venue profile display.
 *
 * Renders the SAME visual system as the in-app VenueProfile component
 * (surface-1/2 cards, same typography scale, same layout primitives)
 * but in read-only mode.
 *
 * Used by:
 *  • PublicVenuePage   → variant="full"    (header card)
 *  • PurchasePage      → variant="compact" ("About the venue" card)
 */

import { MapPin, CheckCircle, Store } from 'lucide-react';
import { SocialLinks } from './SocialLinks';
import { VenueImage } from './VenueImage';

// ── Shared venue-data shape (camelCase, already normalised) ──

export interface VenuePublicData {
  id: string;
  name: string;
  bio?: string | null;
  coverPhotoUrl?: string | null;
  websiteUrl?: string | null;
  instagramHandle?: string | null;
  city?: string | null;
  address?: string | null;
  type?: string | null;
  labels?: string[];
  verified?: boolean;
  foundedYear?: number | null;
  preferredStyles?: string[];
  artGuidelines?: string | null;
}

// ── Props ────────────────────────────────────────────────────

interface FullProps {
  venue: VenuePublicData;
  variant: 'full';
}

interface CompactProps {
  venue: VenuePublicData;
  variant: 'compact';
  /** SPA navigation (no new tab) to the venue's public profile */
  onViewProfile?: () => void;
}

type VenueProfilePublicViewProps = FullProps | CompactProps;

// ── Helpers ──────────────────────────────────────────────────

function locationLine(v: VenuePublicData): string {
  return v.city ?? v.address ?? '';
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase();
}

// ── Component ────────────────────────────────────────────────

export function VenueProfilePublicView(props: VenueProfilePublicViewProps) {
  const { venue, variant } = props;

  // ── Compact variant (Purchase page "About the venue") ───────
  if (variant === 'compact') {
    const onViewProfile = (props as CompactProps).onViewProfile;

    return (
      <div className="bg-[var(--surface-3)] rounded-xl p-4 sm:p-6 border border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">About the venue</h2>

        <div className="flex items-start gap-4">
          {/* Venue avatar / cover thumbnail */}
          <button
            type="button"
            onClick={onViewProfile}
            className="rounded-lg border border-[var(--border)] flex-shrink-0 hover:ring-2 hover:ring-[var(--green)] transition-all cursor-pointer overflow-hidden"
          >
            <VenueImage
              src={venue.coverPhotoUrl}
              alt={venue.name}
              venueId={venue.id}
              size="xs"
            />
          </button>

          <div className="flex-1 min-w-0">
            {/* Name (clickable, SPA nav) */}
            <button
              type="button"
              onClick={onViewProfile}
              className="text-sm text-[var(--text)] font-semibold hover:text-[var(--green)] hover:underline transition-colors cursor-pointer text-left"
            >
              {venue.name}
              {venue.verified && (
                <CheckCircle className="w-3.5 h-3.5 text-[var(--green)] inline ml-1.5 -mt-0.5" />
              )}
            </button>

            {/* Location */}
            {locationLine(venue) && (
              <p className="text-xs text-[var(--text-muted)]">{locationLine(venue)}</p>
            )}

            {/* Type */}
            {venue.type && (
              <p className="text-xs text-[var(--text-muted)]">{venue.type}</p>
            )}

            {/* Bio */}
            <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-3">
              {venue.bio || 'Learn more about the venue displaying this piece.'}
            </p>

            {/* Links row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {onViewProfile && (
                <button
                  type="button"
                  onClick={onViewProfile}
                  className="text-xs text-[var(--accent)] underline"
                >
                  View venue profile
                </button>
              )}

              <SocialLinks
                instagramHandle={venue.instagramHandle}
                websiteUrl={venue.websiteUrl}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full variant (Public venue header card) ─────────────────

  const yearsInBusiness = venue.foundedYear
    ? Math.max(0, new Date().getFullYear() - venue.foundedYear)
    : null;

  return (
    <section className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Cover photo */}
      <VenueImage
        src={venue.coverPhotoUrl}
        alt={venue.name}
        venueId={venue.id}
        size="xl"
      />

      <div className="p-6 sm:p-8">
        {/* Name + verified badge */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl text-[var(--text)]">{venue.name}</h1>
          {venue.verified && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full text-xs">
              <CheckCircle className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>

        {/* Location */}
        {locationLine(venue) && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
            <MapPin className="w-4 h-4" />
            <span>{locationLine(venue)}</span>
          </div>
        )}

        {/* Type + founded */}
        <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--text-muted)] mb-3">
          {venue.type && (
            <span className="px-3 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full text-xs border border-[var(--border)]">
              {venue.type}
            </span>
          )}
          {venue.foundedYear && yearsInBusiness !== null && (
            <span className="text-xs">
              Est. {venue.foundedYear} · {yearsInBusiness} years
            </span>
          )}
        </div>

        {/* Bio */}
        {venue.bio && (
          <p className="text-[var(--text)] mb-4 whitespace-pre-line">{venue.bio}</p>
        )}

        {/* Labels / highlights */}
        {venue.labels && venue.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {venue.labels.map((label) => (
              <span
                key={label}
                className="px-3 py-1 bg-[var(--surface-3)] text-[var(--text)] text-sm rounded-full border border-[var(--border)]"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Social links (deduplicated) */}
        <SocialLinks
          instagramHandle={venue.instagramHandle}
          websiteUrl={venue.websiteUrl}
        />
      </div>
    </section>
  );
}
