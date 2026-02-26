/**
 * VenueMapCard — Compact venue card for the map sidebar/list.
 *
 * Displays venue cover photo, name, type, distance, and a link
 * to the full public venue profile.
 */

import { MapPin, CheckCircle, Store, ExternalLink } from 'lucide-react';
import type { MapVenue } from '../../lib/venueMap';

interface VenueMapCardProps {
  venue: MapVenue;
  isSelected?: boolean;
  onSelect?: (venue: MapVenue) => void;
  onViewProfile?: (venue: MapVenue) => void;
}

export function VenueMapCard({
  venue,
  isSelected,
  onSelect,
  onViewProfile,
}: VenueMapCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(venue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(venue);
        }
      }}
      className="w-full text-left rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] cursor-pointer"
      style={{
        background: isSelected ? 'var(--surface-3)' : 'var(--surface-1)',
        border: isSelected
          ? '2px solid var(--blue)'
          : '1px solid var(--border)',
        padding: isSelected ? '11px' : '12px',
      }}
    >
      <div className="flex gap-3">
        {/* Cover photo / fallback icon */}
        <div
          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--surface-2)' }}
        >
          {venue.coverPhotoUrl ? (
            <img
              src={venue.coverPhotoUrl}
              alt={venue.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Store
              className="w-6 h-6"
              style={{ color: 'var(--text-muted)' }}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--text)' }}
            >
              {venue.name}
            </h3>
            {venue.verified && (
              <CheckCircle
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: 'var(--blue)' }}
              />
            )}
          </div>

          {venue.type && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {venue.type}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {venue.address && (
              <span
                className="flex items-center gap-1 text-xs truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{venue.address}</span>
              </span>
            )}
            {venue.distance != null && (
              <span
                className="text-xs shrink-0 font-medium"
                style={{ color: 'var(--accent)' }}
              >
                {venue.distance < 1
                  ? '< 1 mi'
                  : `${venue.distance.toFixed(1)} mi`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio snippet + profile link */}
      {(venue.bio || onViewProfile) && (
        <div className="mt-2 flex items-end justify-between gap-2">
          {venue.bio && (
            <p
              className="text-xs line-clamp-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {venue.bio}
            </p>
          )}
          {onViewProfile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(venue);
              }}
              className="shrink-0 text-xs font-medium flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[var(--surface-2)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--blue)] outline-none"
              style={{ color: 'var(--blue)' }}
            >
              View <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skeleton placeholder ────────────────────────────────────────────────────

export function VenueMapCardSkeleton() {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex gap-3">
        <div
          className="w-16 h-16 rounded-lg animate-pulse"
          style={{ background: 'var(--skeleton, var(--surface-2))' }}
        />
        <div className="flex-1 space-y-2 py-1">
          <div
            className="h-4 w-3/4 rounded animate-pulse"
            style={{ background: 'var(--skeleton, var(--surface-2))' }}
          />
          <div
            className="h-3 w-1/2 rounded animate-pulse"
            style={{ background: 'var(--skeleton, var(--surface-2))' }}
          />
          <div
            className="h-3 w-2/3 rounded animate-pulse"
            style={{ background: 'var(--skeleton, var(--surface-2))' }}
          />
        </div>
      </div>
    </div>
  );
}
