/**
 * Canonical purchase deep-link for an artwork.
 *
 * All QR codes, "Copy URL" buttons, and Stripe success/cancel redirects
 * MUST use this helper so the format never drifts.
 *
 * Current format:  https://artwalls.space/#/purchase-<artworkId>
 *
 * The SPA hash listener in App.tsx parses `#/purchase-<id>` and renders
 * the PurchasePage component for that artwork.
 */

const SITE_ORIGIN = (() => {
  if (typeof window === 'undefined') return 'https://artwalls.space';
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
  return 'https://artwalls.space';
})();

/**
 * Build the canonical purchase deep-link for an artwork.
 * @param artworkId  UUID of the artwork
 * @returns Full URL suitable for QR encoding, clipboard copy, or Stripe redirect
 */
export function artworkPurchaseUrl(artworkId: string): string {
  return `${SITE_ORIGIN}/#/purchase-${artworkId}`;
}
