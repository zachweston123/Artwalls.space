const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const SAME_ORIGIN_BASE = typeof window !== 'undefined' ? window.location.origin : '';

async function fetchWithFallback(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (err) {
    const shouldFallback =
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
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const adminPass = typeof window !== 'undefined' ? window.localStorage.getItem('adminPassword') : null;
      if (adminPass) headers['x-admin-password'] = adminPass;
    } catch {}
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
    });
  } catch (fetchErr: any) {
    console.error('[apiGet] Network error:', fetchErr);
    throw new Error(`Network error: ${fetchErr?.message || 'Failed to fetch'}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[apiGet] Server error:', res.status, text);
    throw new Error(text || `Request failed: ${res.status}`);
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
    });
  } catch (fetchErr: any) {
    // Distinguish network/CORS errors from server errors
    const isCorsError = fetchErr?.message?.includes('Failed to fetch') || 
                       fetchErr?.message?.includes('CORS');
    const isOffline = !navigator.onLine;
    
    if (isOffline) {
      throw new Error('You appear to be offline. Please check your internet connection and try again.');
    }
    if (isCorsError) {
      throw new Error('Connection blocked by browser security. Please refresh the page and try again.');
    }
    throw new Error(`Network error: ${fetchErr?.message || 'Unable to connect to server'}`);
  }
  
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      const extracted = errorData?.error ?? errorData?.message ?? errorMsg;
      // Guard against non-string values turning into "[object Object]"
      errorMsg = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
    } catch {
      // If not JSON, use status text
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
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
  slotMinutes: number; // 30 | 60 | 90 | 120
  timezone?: string | null;
}

export async function getVenueSchedule(venueId: string) {
  return apiGet<{ schedule: VenueSchedule | null }>(`/api/venues/${venueId}/schedule`);
}

export async function saveVenueSchedule(venueId: string, schedule: Omit<VenueSchedule, 'id' | 'venueId'>) {
  return apiPost<{ schedule: VenueSchedule }>(`/api/venues/${venueId}/schedule`, schedule);
}

export async function getVenueAvailability(venueId: string, weekStart?: string) {
  const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
  return apiGet<{
    slots: string[]; // ISO strings
    slotMinutes: number;
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
export async function getMyNotifications() {
  return apiGet<{ notifications: Array<{ id: string; type: string; title: string; message?: string; isRead: boolean; createdAt: string }> }>(`/api/notifications`);
}

export async function markNotificationRead(id: string) {
  return apiPost<{ notification: any }>(`/api/notifications/${id}/read`, {});
}
