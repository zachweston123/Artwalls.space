import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';

export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string | null;
  type: 'info' | 'success' | 'warning' | 'critical';
  audience: 'all' | 'artists' | 'venues';
}

/**
 * Fetch active announcements for the given audience role.
 * Dismissed announcements are remembered in sessionStorage so they
 * stay hidden for the current browser tab/session.
 */
export function useAnnouncements(role: 'artists' | 'venues') {
  const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem('dismissed_announcements');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ announcements: ActiveAnnouncement[] }>(
          `/api/announcements?audience=${encodeURIComponent(role)}`
        );
        if (!cancelled) setAnnouncements(res.announcements ?? []);
      } catch {
        // Announcements are non-critical — fail silently
      }
    })();
    return () => { cancelled = true; };
  }, [role]);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try { sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  return { announcements: visible, dismiss };
}
