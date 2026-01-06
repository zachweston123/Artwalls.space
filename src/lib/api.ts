const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.artwalls.space';

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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeader },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
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
