/**
 * Measurement event taxonomy for Artwalls.
 *
 * Every event has a `name` (kebab-case) and a typed `properties` bag.
 * No PII (emails, names, addresses) is ever included — only opaque IDs,
 * the user's role, and structural metadata.
 *
 * See docs/measurement.md for the full taxonomy table.
 */

// ─── Core Web Vitals ─────────────────────────────────────────────────────────

export interface CWVProperties {
  /** Metric name: LCP | INP | CLS | FCP | TTFB */
  metric: string;
  /** The metric value (ms for timing, unitless for CLS) */
  value: number;
  /** Rating from web-vitals: 'good' | 'needs-improvement' | 'poor' */
  rating: string;
  /** Navigation type (navigate, reload, back_forward, prerender) */
  navigationType?: string;
}

// ─── Funnel: Landing → Role Selection → Signup/Login ─────────────────────────

export interface LandingViewProperties {
  /** The entry path, e.g. '/', '/why-artwalls', '/venues' */
  entryPath: string;
  /** UTM source if present */
  utmSource?: string;
  /** UTM medium if present */
  utmMedium?: string;
  /** UTM campaign if present */
  utmCampaign?: string;
}

export interface RoleSelectedProperties {
  /** 'artist' | 'venue' */
  role: 'artist' | 'venue';
  /** Where the selection happened: 'landing' | 'google_oauth' | 'signup_form' */
  source: string;
}

export interface AuthCompleteProperties {
  /** 'signup' | 'login' */
  action: 'signup' | 'login';
  /** 'email' | 'google' */
  method: 'email' | 'google';
  /** The role after auth */
  role: string;
}

// ─── Funnel: Onboarding ──────────────────────────────────────────────────────

export interface OnboardingStepProperties {
  /** 1-based step number */
  step: number;
  /** Human-readable step name */
  stepName: string;
  /** 'started' | 'completed' | 'skipped' */
  action: 'started' | 'completed' | 'skipped';
}

export interface OnboardingFinishedProperties {
  /** Total steps completed */
  stepsCompleted: number;
  /** Whether plan selection was skipped */
  skippedPlanSelection: boolean;
}

// ─── Funnel: Artwork Publish ─────────────────────────────────────────────────

export interface ArtworkPublishProperties {
  artworkId: string;
  /** Whether the artwork was a draft being published vs first creation */
  isFirstPublish: boolean;
}

// ─── Funnel: QR Scan → View → Checkout → Purchase ───────────────────────────
// (These map to the existing app_events table but are now also emitted
//  client-side through the unified analytics layer.)

export interface QrScanProperties {
  artworkId: string;
  venueId?: string;
  artistId?: string;
}

export interface ArtworkViewProperties {
  artworkId: string;
  venueId?: string;
  artistId?: string;
}

export interface CheckoutStartProperties {
  artworkId: string;
  venueId?: string;
  artistId?: string;
  priceUsd?: number;
}

export interface PurchaseSuccessProperties {
  artworkId: string;
  venueId?: string;
  artistId?: string;
}

// ─── Page View (lightweight SPA nav tracking) ────────────────────────────────

export interface PageViewProperties {
  /** SPA page key, e.g. 'artist-dashboard', 'purchase-<id>' */
  page: string;
  /** URL path */
  path: string;
}

// ─── First-Win Measurement Events ────────────────────────────────────────────

export interface SignupCompleteProperties {
  role: 'artist' | 'venue';
  method: 'email' | 'google';
}

export interface FirstArtworkPublishedProperties {
  artworkId: string;
  /** Minutes since signup (client-computed) */
  minutesSinceSignup?: number;
}

export interface FirstCallPublishedProperties {
  callId?: string;
  minutesSinceSignup?: number;
}

export interface FirstApplicationSubmittedProperties {
  applicationId?: string;
  minutesSinceSignup?: number;
}

export interface TimeToFirstWinProperties {
  role: 'artist' | 'venue';
  /** Minutes from signup to all checklist items complete */
  minutes: number;
}

// ─── Union of all event names ────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'cwv'
  | 'page_view'
  | 'landing_view'
  | 'role_selected'
  | 'auth_complete'
  | 'onboarding_step'
  | 'onboarding_finished'
  | 'artwork_publish'
  | 'qr_scan'
  | 'artwork_view'
  | 'checkout_start'
  | 'purchase_success'
  | 'signup_complete'
  | 'first_artwork_published'
  | 'first_call_published'
  | 'first_application_submitted'
  | 'time_to_first_win';

/**
 * Union type for all event property bags.
 * Each event name maps to its specific properties type.
 */
export type AnalyticsEventProperties =
  | CWVProperties
  | PageViewProperties
  | LandingViewProperties
  | RoleSelectedProperties
  | AuthCompleteProperties
  | OnboardingStepProperties
  | OnboardingFinishedProperties
  | ArtworkPublishProperties
  | QrScanProperties
  | ArtworkViewProperties
  | CheckoutStartProperties
  | PurchaseSuccessProperties
  | SignupCompleteProperties
  | FirstArtworkPublishedProperties
  | FirstCallPublishedProperties
  | FirstApplicationSubmittedProperties
  | TimeToFirstWinProperties;

/**
 * Envelope sent to the /api/analytics endpoint.
 * Contains common fields attached by the trackEvent wrapper.
 */
export interface AnalyticsEnvelope {
  /** Event name from the taxonomy */
  name: AnalyticsEventName;
  /** Typed properties bag */
  properties: Record<string, unknown>;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Stable anonymous session ID */
  sessionId: string;
  /** Current SPA route */
  route: string;
  /** User role if known: 'artist' | 'venue' | 'admin' | null */
  userRole: string | null;
}
