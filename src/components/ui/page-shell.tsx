import { cn } from './utils';

const sizeMap = {
  narrow: 'max-w-4xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
  full: 'max-w-full',
} as const;

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max-width preset. Default = 6xl (1152 px). */
  size?: keyof typeof sizeMap;
}

/**
 * Consistent page-level container.
 * Applies max-width, horizontal padding, vertical padding, and background.
 */
export function PageShell({
  size = 'default',
  className,
  children,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 bg-[var(--bg)]',
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
