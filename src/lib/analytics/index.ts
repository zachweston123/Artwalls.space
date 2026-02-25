/**
 * Barrel export for the analytics module.
 *
 * Usage:
 *   import { trackAnalyticsEvent, setAnalyticsContext } from '../lib/analytics';
 *   import { initCoreWebVitals } from '../lib/analytics/cwv';
 */

export { trackAnalyticsEvent, setAnalyticsContext } from './trackEvent';
export type {
  AnalyticsEventName,
  AnalyticsEnvelope,
  CWVProperties,
  PageViewProperties,
  LandingViewProperties,
  RoleSelectedProperties,
  AuthCompleteProperties,
  OnboardingStepProperties,
  OnboardingFinishedProperties,
  ArtworkPublishProperties,
  QrScanProperties,
  ArtworkViewProperties,
  CheckoutStartProperties,
  PurchaseSuccessProperties,
} from './types';
