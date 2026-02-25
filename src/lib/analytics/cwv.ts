/**
 * Core Web Vitals reporting via the `web-vitals` library.
 *
 * Captures LCP, INP, CLS, FCP, and TTFB and forwards each metric to the
 * unified analytics pipeline as a `cwv` event.
 *
 * This module is lazily imported (dynamic import in App.tsx) so it adds
 * zero bytes to the critical bundle for users whose browsers don't support
 * the Performance Observer API.
 *
 * See docs/measurement.md for target thresholds.
 */

import { trackAnalyticsEvent } from './trackEvent';

/**
 * Initialize CWV collection.  Call once from the app entry point.
 * Each metric fires exactly once per page load (the library handles this).
 */
export async function initCoreWebVitals(): Promise<void> {
  try {
    // Dynamic import keeps web-vitals out of the main bundle unless this
    // function is actually called.
    const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import('web-vitals');

    const report = (metric: { name: string; value: number; rating: string; navigationType?: string }) => {
      trackAnalyticsEvent('cwv', {
        metric: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        navigationType: metric.navigationType ?? undefined,
      });
    };

    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    // Silently degrade: browser doesn't support Performance Observer
  }
}
