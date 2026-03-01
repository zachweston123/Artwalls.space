/**
 * venueRequests.ts — Shared constants and types for the venue request
 * (application + waitlist) system.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 *   • Monthly application/waitlist quota per tier
 *   • Request types and statuses
 *   • Valid status transitions (finite-state machine)
 *
 * Imported by both the React client and the Cloudflare Worker.
 */

// ── Types ──────────────────────────────────────────────────────────────

export type RequestType = 'application' | 'waitlist';

export type RequestStatus =
  // Application statuses
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  // Waitlist statuses
  | 'waitlisted'
  | 'invited_to_apply'
  | 'removed'
  | 'converted_to_application';

export type ArtistTier = 'free' | 'starter' | 'growth' | 'pro';

export interface VenueRequest {
  id: string;
  artist_id: string;
  venue_id: string;
  request_type: RequestType;
  status: RequestStatus;
  message: string | null;
  artwork_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, populated by specific queries)
  venues?: { name: string; city?: string | null; cover_photo_url?: string | null } | null;
  artists?: { name: string; subscription_tier?: string | null } | null;
}

// ── Monthly quota per tier ─────────────────────────────────────────────

/**
 * Monthly application + waitlist quota per artist tier.
 * Both request types consume the same pool.
 *
 * Infinity = unlimited.
 */
export const TIER_REQUEST_LIMITS: Record<ArtistTier, number> = {
  free: 2,
  starter: 5,
  growth: Infinity,
  pro: Infinity,
} as const;

/** Human-readable label for the plan comparison UI. */
export function requestLimitLabel(tier: ArtistTier): string {
  const limit = TIER_REQUEST_LIMITS[tier];
  return Number.isFinite(limit) ? String(limit) : 'Unlimited';
}

// ── Terminal statuses ──────────────────────────────────────────────────

/**
 * Terminal statuses — a request in one of these states is "done" and
 * does NOT block a new request for the same artist+venue pair.
 */
export const TERMINAL_STATUSES: ReadonlySet<RequestStatus> = new Set([
  'rejected',
  'withdrawn',
  'removed',
  'approved',
  'converted_to_application',
]);

/**
 * Statuses that count toward the monthly quota.
 * We count everything created this month EXCEPT withdrawn/removed
 * (artist voluntarily retracted before any venue action).
 */
export const QUOTA_EXCLUDED_STATUSES: ReadonlySet<RequestStatus> = new Set([
  'withdrawn',
  'removed',
]);

// ── Status transition rules (finite-state machine) ─────────────────

/**
 * Valid status transitions keyed by actor.
 *
 * artist_transitions:  what the artist can change a request's status to.
 * venue_transitions:   what the venue can change a request's status to.
 */
export const ARTIST_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  submitted: ['withdrawn'],
  waitlisted: ['removed'],
  invited_to_apply: ['withdrawn'], // decline the invite
};

export const VENUE_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  submitted: ['approved', 'rejected'],
  waitlisted: ['invited_to_apply', 'removed', 'rejected', 'converted_to_application'],
  invited_to_apply: ['rejected', 'removed'],
};

/** Check if a status transition is valid for the given actor. */
export function isValidTransition(
  actor: 'artist' | 'venue',
  fromStatus: RequestStatus,
  toStatus: RequestStatus,
): boolean {
  const table = actor === 'artist' ? ARTIST_TRANSITIONS : VENUE_TRANSITIONS;
  return table[fromStatus]?.includes(toStatus) ?? false;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Get the initial status for a given request type. */
export function initialStatus(type: RequestType): RequestStatus {
  return type === 'waitlist' ? 'waitlisted' : 'submitted';
}

/** Human-readable status labels for display. */
export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  waitlisted: 'Waitlisted',
  invited_to_apply: 'Invited to Apply',
  removed: 'Removed',
  converted_to_application: 'Converted',
};

/** Color intent for status badges. */
export const STATUS_COLORS: Record<RequestStatus, 'green' | 'blue' | 'red' | 'muted'> = {
  submitted: 'blue',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'muted',
  waitlisted: 'blue',
  invited_to_apply: 'green',
  removed: 'muted',
  converted_to_application: 'green',
};
