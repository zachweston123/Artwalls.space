/**
 * SkipLink — Accessibility skip-to-content link.
 *
 * Invisible by default; becomes visible when focused via keyboard Tab.
 * Jumps the user past the navigation bar to `#main-content`.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--blue)] focus:text-[var(--on-blue)] focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
    >
      Skip to main content
    </a>
  );
}
