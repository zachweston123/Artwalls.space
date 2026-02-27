/**
 * VenueImage — Shared image component for venue profile/cover photos.
 *
 * Handles:
 *  • Rendering the image from a URL string
 *  • Graceful fallback when the URL is null, empty, or fails to load (onError)
 *  • Consistent placeholder icon across all surfaces
 *  • Console warning with venue ID when an image fails (for debugging)
 *
 * Usage:
 *   <VenueImage src={venue.coverPhoto} alt={venue.name} venueId={venue.id} />
 *   <VenueImage src={venue.coverPhoto} alt={venue.name} venueId={venue.id} size="sm" />
 */

import { useState } from 'react';
import { Store } from 'lucide-react';

// ── Size presets ──

const SIZE_PRESETS = {
  /** 14×14 avatar (used in compact venue cards) */
  xs: { container: 'w-14 h-14', icon: 'w-5 h-5' },
  /** 16×16 thumbnail (map sidebar cards) */
  sm: { container: 'w-16 h-16', icon: 'w-6 h-6' },
  /** 48px-high banner (inline card headers) */
  md: { container: 'h-48 w-full', icon: 'w-10 h-10' },
  /** 64px-high banner (profile headers) */
  lg: { container: 'h-64 w-full', icon: 'w-12 h-12' },
  /** Variable-height banner (public profile hero) */
  xl: { container: 'h-48 sm:h-64 w-full', icon: 'w-16 h-16' },
} as const;

type SizePreset = keyof typeof SIZE_PRESETS;

// ── Props ──

interface VenueImageProps {
  /** Full URL of the venue profile/cover image, or null. */
  src: string | null | undefined;
  /** Alt text (typically the venue name). */
  alt: string;
  /** Venue ID — used in console warnings for debugging. */
  venueId?: string;
  /** Size preset. Defaults to "md". */
  size?: SizePreset;
  /** Extra CSS classes on the outer container. */
  className?: string;
  /** Extra CSS classes on the <img> element. */
  imgClassName?: string;
  /** Whether to scale on hover (e.g. in cards). */
  hoverScale?: boolean;
}

// ── Component ──

export function VenueImage({
  src,
  alt,
  venueId,
  size = 'md',
  className = '',
  imgClassName = '',
  hoverScale = false,
}: VenueImageProps) {
  const [failed, setFailed] = useState(false);
  const preset = SIZE_PRESETS[size];

  const showFallback = !src || failed;

  return (
    <div
      className={`${preset.container} overflow-hidden bg-[var(--surface-2)] ${className}`}
    >
      {showFallback ? (
        <div className="w-full h-full bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] flex items-center justify-center">
          <Store className={`${preset.icon} text-[var(--text-muted)] opacity-40`} />
        </div>
      ) : (
        <img
          src={src!}
          alt={alt}
          className={`w-full h-full object-cover ${hoverScale ? 'group-hover:scale-105 transition-transform' : ''} ${imgClassName}`}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (venueId) {
              console.warn(
                `[VenueImage] Failed to load image for venue ${venueId}:`,
                src,
              );
            }
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}
