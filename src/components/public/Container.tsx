/**
 * Container — consistent max-width + horizontal padding for public pages.
 *
 * "default" = max-w-6xl (full-width sections like hero, value props).
 * "narrow"  = max-w-4xl (card grids, step cards).
 */
import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  /** "default" = max-w-6xl, "narrow" = max-w-4xl */
  size?: 'default' | 'narrow';
  className?: string;
}

export function Container({
  children,
  size = 'default',
  className = '',
}: ContainerProps) {
  const maxW = size === 'narrow' ? 'max-w-4xl' : 'max-w-6xl';

  return (
    <div className={[maxW, 'mx-auto px-4 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
