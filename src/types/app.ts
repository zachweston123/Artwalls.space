/**
 * Shared types for the Artwalls frontend application.
 *
 * Extracted from App.tsx so that route-level modules can import
 * them without creating circular dependencies.
 */

export type UserRole = 'artist' | 'venue' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Parameters passed to the navigation handler. */
export interface NavigateParams {
  userId?: string;
  venueId?: string;
  artistId?: string;
  callId?: string;
  artistSlugOrId?: string;
}

/** Navigation handler signature used by all route components. */
export type NavigateFn = (page: string, params?: NavigateParams) => void;
