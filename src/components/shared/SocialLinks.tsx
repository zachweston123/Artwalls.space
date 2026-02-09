/**
 * SocialLinks – shared, deduplicated social-link row.
 *
 * Used by:
 *  • ArtistProfilePublicView  (full + compact variants)
 *  • VenueProfilePublicView   (full + compact variants)
 *  • VenueProfileView         (in-app venue profile)
 *  • VenueProfile             (in-app owner view)
 *
 * Never shows duplicate Instagram links.
 */

import { ExternalLink, Instagram } from 'lucide-react';
import { getDeduplicatedLinks, type SocialLinkInput } from '../../lib/socialLinks';

interface SocialLinksProps extends SocialLinkInput {
  /** Optional extra className on the wrapper */
  className?: string;
  /** Size variant – "sm" renders smaller text/icons (for compact cards) */
  size?: 'sm' | 'md';
}

export function SocialLinks({
  instagramHandle,
  portfolioUrl,
  websiteUrl,
  className = '',
  size = 'md',
}: SocialLinksProps) {
  const links = getDeduplicatedLinks({ instagramHandle, portfolioUrl, websiteUrl });

  if (links.length === 0) return null;

  const textCls = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`flex items-center flex-wrap gap-4 ${className}`}>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-1.5 ${textCls} text-[var(--blue)] hover:underline`}
        >
          {link.type === 'instagram' ? (
            <Instagram className={iconCls} />
          ) : (
            <ExternalLink className={iconCls} />
          )}
          {link.label}
        </a>
      ))}
    </div>
  );
}

/**
 * Backward-compatible alias – keep old imports working until fully migrated.
 * @deprecated Use `SocialLinks` instead.
 */
export const ArtistSocialLinks = SocialLinks;
