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
      ? 'pt-20 pb-16 md:pt-28 md:pb-20 lg:pt-32 lg:pb-24'
      : size === 'sm'
        ? 'py-10 md:py-14'
        : 'py-16 md:py-20 lg:py-24';

  return (
    <section
      className={[py, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </section>
  );
}
