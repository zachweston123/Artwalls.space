import { supabase } from './supabase';

const DEFAULT_API_BASE = (() => {
  if (typeof window === 'undefined') return 'https://api.artwalls.space';
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Prefer Wrangler dev (8787) if available, fall back to Express (4242).
    // VITE_API_BASE_URL env var overrides both (see below).
    return 'http://localhost:8787';
  }
  // In production, the Worker API is on api.artwalls.space.
  // Derive from the hostname so staging subdomains also work.
  if (hostname === 'artwalls.space' || hostname === 'www.artwalls.space') {
    return 'https://api.artwalls.space';
  }
  // Cloudflare Pages preview deploys: fall back to production API
  return 'https://api.artwalls.space';
})();

const API_BASE = import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE;
const SAME_ORIGIN_BASE = typeof window !== 'undefined' ? window.location.origin : '';

async function fetchWithFallback(input: string, init: RequestInit, allowSameOriginRetry = false) {
  // Only retry on same-origin for safe (idempotent) methods.
  // POST/PATCH/PUT/DELETE must never silently retry — they could hit the
  // wrong server (Express instead of Worker) or create duplicate resources.
  const method = (init.method || 'GET').toUpperCase();
  const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const canRetry = allowSameOriginRetry && isSafeMethod;

  try {
    const res = await fetch(input, init);
    if (!canRetry) return res;

    const shouldRetrySameOrigin =
      SAME_ORIGIN_BASE &&
      API_BASE &&
      API_BASE !== SAME_ORIGIN_BASE &&
      input.startsWith(API_BASE) &&
      res.status === 404;

    if (!shouldRetrySameOrigin) return res;

    const fallbackUrl = input.replace(API_BASE, SAME_ORIGIN_BASE);
    return await fetch(fallbackUrl, init);
  } catch (err) {
    const shouldFallback =
      canRetry &&
      SAME_ORIGIN_BASE &&
      API_BASE &&
      API_BASE !== SAME_ORIGIN_BASE &&
      input.startsWith(API_BASE);
    if (!shouldFallback) throw err;
    const fallbackUrl = input.replace(API_BASE, SAME_ORIGIN_BASE);
    return await fetch(fallbackUrl, init);
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  } catch {
    return {};
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const authHeader = await getAuthHeader();
  let res: Response;
  try {
    res = await fetchWithFallback(`${API_BASE}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeader },
    }, true);
  } catch (fetchErr: unknown) {
    console.error('[apiGet] Network error:', fetchErr);
    throw new Error(`Network error: ${fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch'}`);
  }
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      if (res.status === 429 || errorData?.error === 'rate_limited') {
        const retryAfter = errorData?.retryAfterSec || res.headers.get('Retry-After') || 60;
        throw new Error(`Too many requests. Please wait ${retryAfter} seconds and try again.`);
      }
      const extracted = errorData?.error ?? errorData?.message ?? errorMsg;
      errorMsg = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message.startsWith('Too many requests')) throw parseErr;
      const text = await res.text().catch(() => '');
      errorMsg = text || errorMsg;
    }
    console.error('[apiGet] Server error:', res.status, errorMsg);
    throw new Error(errorMsg);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Unexpected response from server.');
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const authHeader = await getAuthHeader();
  let res: Response;
  try {
    res = await fetchWithFallback(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(headers || {}),
      },
      body: JSON.stringify(body),
    }, true);
  } catch (fetchErr: unknown) {
    // Distinguish network/CORS errors from server errors
    const msg = fetchErr instanceof Error ? fetchErr.message : '';
    const isCorsError = msg.includes('Failed to fetch') || 
                       msg.includes('CORS');
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
      throw new Error('You appear to be offline. Please check your internet connection and try again.');
    }
    if (isCorsError) {
      throw new Error('Connection blocked by browser security. Please refresh the page and try again.');
    }
    throw new Error(`Network error: ${msg || 'Unable to connect to server'}`);
  }
  
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      // Handle rate limiting with a user-friendly message
      if (res.status === 429 || errorData?.error === 'rate_limited') {
        const retryAfter = errorData?.retryAfterSec || res.headers.get('Retry-After') || 60;
        throw new Error(`Too many requests. Please wait ${retryAfter} seconds and try again.`);
      }
      const extracted = errorData?.error ?? errorData?.message ?? errorMsg;
      // Guard against non-string values turning into "[object Object]"
      errorMsg = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
    } catch (parseErr) {
      // Re-throw if it's our rate-limit error
      if (parseErr instanceof Error && parseErr.message.startsWith('Too many requests')) throw parseErr;
      // If not JSON, use status text
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Unexpected response from server.');
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  let res: Response;
  try {
    res = await fetchWithFallback(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    }, true);
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : '';
    throw new Error(`Network error: ${msg || 'Unable to connect to server'}`);
  }

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      const extracted = errorData?.error ?? errorData?.message ?? errorMsg;
      errorMsg = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Unexpected response from server.');
  }
  return (await res.json()) as T;
}

export { API_BASE };

// -------- Scheduling --------
export interface VenueSchedule {
  id?: string;
  venueId: string;
  dayOfWeek: string; // e.g., 'Thursday'
  startTime: string; // '16:00'
  endTime: string;   // '18:00'
  slotMinutes?: number; // legacy field
  installSlotIntervalMinutes?: number; // 15 | 30 | 60 | 120
  timezone?: string | null;
}

export async function getVenueSchedule(venueId: string) {
  return apiGet<{ schedule: VenueSchedule | null }>(`/api/venues/${venueId}/schedule`);
}

export async function saveVenueSchedule(venueId: string, schedule: Omit<VenueSchedule, 'id' | 'venueId'>) {
  const interval = schedule.installSlotIntervalMinutes ?? schedule.slotMinutes ?? 60;
  const allowedIntervals = new Set([15, 30, 60, 120]);
  if (!allowedIntervals.has(interval)) {
    throw new Error('Invalid slot interval. Allowed: 15, 30, 60, 120 minutes.');
  }

  // x-venue-id enables local/dev environments where Supabase auth is absent but server allows a fallback
  try {
    return await apiPost<{ schedule: VenueSchedule }>(`/api/venues/${venueId}/schedule`, schedule, { 'x-venue-id': venueId });
  } catch (apiErr) {
    // Fallback: write directly via Supabase with RLS (auth.uid() must match venue_id)
    console.warn('[saveVenueSchedule] API save failed, falling back to Supabase direct write:', apiErr);
    const { data, error } = await supabase
      .from('venue_schedules')
      .upsert({
        venue_id: venueId,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        slot_minutes: interval,
        install_slot_interval_minutes: interval,
        timezone: schedule.timezone ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'venue_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[saveVenueSchedule] Supabase fallback failed:', error);
      throw apiErr;
    }

    const mapped: VenueSchedule = {
      id: data.id,
      venueId: data.venue_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      slotMinutes: data.slot_minutes,
      installSlotIntervalMinutes: data.install_slot_interval_minutes ?? data.slot_minutes ?? interval,
      timezone: data.timezone,
    };
    return { schedule: mapped };
  }
}

export async function getVenueAvailability(venueId: string, weekStart?: string) {
  const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
  return apiGet<{
    slots: string[]; // ISO strings
    slotMinutes: number;
    slotIntervalMinutes?: number;
    dayOfWeek: string | null;
    startTime: string | null;
    endTime: string | null;
    windowStart?: string;
    windowEnd?: string;
  }>(`/api/venues/${venueId}/availability${qs}`);
}

export async function createVenueBooking(venueId: string, body: { artworkId?: string; type: 'install' | 'pickup'; startAt: string }) {
  return apiPost<{ booking: { id: string }; links?: { ics: string; google: string } }>(`/api/venues/${venueId}/bookings`, body);
}

// -------- Notifications --------
export async function getMyNotifications(userId: string, role: string) {
  const qs = `?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`;
  return apiGet<{ notifications: Array<{ id: string; type: string; title: string; message?: string; isRead?: boolean; createdAt: string; artworkId?: string | null; orderId?: string | null }> }>(`/api/notifications${qs}`);
}

export async function setNotificationReadState(id: string, isRead: boolean) {
  const suffix = isRead ? 'read' : 'unread';
  return apiPost<{ notification: { id: string; isRead: boolean } }>(`/api/notifications/${id}/${suffix}`, {});
}

// -------- Venue Invites --------
export type VenueInviteStatus = 'DRAFT' | 'SENT' | 'CLICKED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface VenueInviteSummary {
  id: string;
  token: string;
  artistId: string;
  placeId: string;
  venueName: string;
  venueAddress?: string | null;
  googleMapsUrl?: string | null;
  websiteUrl?: string | null;
  phone?: string | null;
  venueEmail?: string | null;
  personalLine?: string | null;
  subject?: string | null;
  bodyTemplateVersion?: string | null;
  status: VenueInviteStatus;
  sentAt?: string | null;
  firstClickedAt?: string | null;
  clickCount?: number | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listMyVenueInvites(limit = 100): Promise<VenueInviteSummary[]> {
  const qs = Number.isFinite(limit) ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const { invites } = await apiGet<{ invites: VenueInviteSummary[] }>(`/api/venue-invites${qs}`);
  return invites || [];
}

export async function acceptVenueInvite(token: string) {
  const safeToken = String(token || '').trim();
  if (!safeToken) throw new Error('Invite token is required.');
  return apiPost<{ invite: VenueInviteSummary }>(`/api/venue-invites/token/${encodeURIComponent(safeToken)}/accept`, {});
}

export async function declineVenueInvite(token: string) {
  const safeToken = String(token || '').trim();
  if (!safeToken) throw new Error('Invite token is required.');
  return apiPost<{ invite: VenueInviteSummary }>(`/api/venue-invites/token/${encodeURIComponent(safeToken)}/decline`, {});
}
