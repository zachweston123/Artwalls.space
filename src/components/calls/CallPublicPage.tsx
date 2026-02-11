import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';

interface CallData {
  title: string;
  description?: string;
  submission_fee_cents?: number;
  submission_deadline?: string;
}

interface CallPublicPageProps {
  callId: string;
}

export function CallPublicPage({ callId }: CallPublicPageProps) {
  const [call, setCall] = useState<CallData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ call: CallData }>(`/api/calls/${callId}`);
        setCall(res.call);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load call');
      }
    })();
  }, [callId]);

  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">{call?.title || 'Call for Art'}</h1>
      <p className="text-[var(--text-muted)] mb-4">{call?.description || 'Details coming soon.'}</p>
      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-4">
        <p className="text-sm">Submission fee: ${(call?.submission_fee_cents || 0) / 100}</p>
        <p className="text-sm">Deadline: {call?.submission_deadline || 'Rolling'}</p>
      </div>
      <a href={`/calls/${callId}/apply`} className="inline-block px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
        Apply to show
      </a>
    </div>
  );
}
