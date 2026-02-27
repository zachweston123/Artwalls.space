/**
 * Section — consistent vertical-rhythm wrapper for public pages.
 *
 * Purely a spacing/rhythm wrapper — never sets a background colour.
 * The page has ONE canonical background (--bg) and visual separation
 * comes from elevated card surfaces (--surface-1) + borders + shadows.
 */
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  /** "default" = standard, "sm" = compact, "hero" = generous top */
  size?: 'default' | 'sm' | 'hero';
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
}

export function Section({
  children,
  size = 'default',
  className = '',
  ...rest
}: SectionProps) {
  const py =
    size === 'hero'
      ? 'pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24 lg:pt-36 lg:pb-28'
      : size === 'sm'
        ? 'py-12 md:py-16'
        : 'py-16 md:py-24 lg:py-28';

  return (
    <section
      className={[py, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </section>
  );
}
