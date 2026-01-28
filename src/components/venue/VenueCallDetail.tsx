import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';

interface VenueCallDetailProps {
  callId: string;
  onBack: () => void;
}

export function VenueCallDetail({ callId, onBack }: VenueCallDetailProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiGet<{ applications: any[] }>(`/api/calls/${callId}/applications`);
      setApplications(res.applications || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load applications');
    }
  };

  const updateStatus = async (applicationId: string, status: string) => {
    await apiPost(`/api/calls/${callId}/applications/${applicationId}/status`, { status });
    await load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <button onClick={onBack} className="text-sm text-[var(--accent)] underline mb-4">← Back</button>
      <h1 className="text-2xl mb-4">Applications</h1>
      {error && <p className="text-sm text-[var(--danger)] mb-4">{error}</p>}
      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Artist: {app.artist_user_id}</p>
                <p className="text-xs text-[var(--text-muted)]">Status: {app.status}</p>
              </div>
              <div className="flex gap-2">
                <button className="text-xs underline" onClick={() => updateStatus(app.id, 'accepted')}>Accept</button>
                <button className="text-xs underline" onClick={() => updateStatus(app.id, 'waitlisted')}>Waitlist</button>
                <button className="text-xs underline" onClick={() => updateStatus(app.id, 'rejected')}>Reject</button>
              </div>
            </div>
          </div>
        ))}
        {applications.length === 0 && <p className="text-xs text-[var(--text-muted)]">No applications yet.</p>}
      </div>
    </div>
  );
}
