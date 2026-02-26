/**
 * Section — consistent vertical-rhythm wrapper for public pages.
 *
 * Enforces a shared py pattern so every section on the homepage
 * has the same breathing room (py-16 → py-20 → py-24 across breakpoints).
 */
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  /** "base" = page background, "raised" = surface-1 (alternates) */
  surface?: 'base' | 'raised';
  /** "default" = standard, "sm" = compact, "hero" = generous top */
  size?: 'default' | 'sm' | 'hero';
  className?: string;
  id?: string;
  'aria-labelledby'?: string;
}

export function Section({
  children,
  surface = 'base',
  size = 'default',
  className = '',
  ...rest
}: SectionProps) {
  const bg = surface === 'raised' ? 'bg-[var(--surface-1)]' : '';
  const py =
    size === 'hero'
      ? 'pt-20 pb-16 md:pt-28 md:pb-20 lg:pt-32 lg:pb-24'
      : size === 'sm'
        ? 'py-10 md:py-14'
        : 'py-16 md:py-20 lg:py-24';

  return (
    <section
      className={[bg, py, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </section>
  );
}
