import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import type { User } from '../../App';

interface VenueCallsProps {
  user: User;
  onViewCall: (callId: string) => void;
}

export function VenueCalls({ user, onViewCall }: VenueCallsProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wallConstraints, setWallConstraints] = useState('');
  const [maxDimensions, setMaxDimensions] = useState('');
  const [maxPieces, setMaxPieces] = useState('');
  const [preferredTags, setPreferredTags] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [submissionFee, setSubmissionFee] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [installWindowStart, setInstallWindowStart] = useState('');
  const [installWindowEnd, setInstallWindowEnd] = useState('');
  const [showStart, setShowStart] = useState('');
  const [showEnd, setShowEnd] = useState('');
  const [maxApplications, setMaxApplications] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await apiGet<{ calls: any[] }>(`/api/calls?venueId=${encodeURIComponent(user.id)}`);
    setCalls(res.calls || []);
  };

  const createCall = async () => {
    try {
      setError(null);
      await apiPost('/api/calls', {
        title,
        description,
        wallConstraints,
        maxDimensions,
        maxPieces: maxPieces ? Number(maxPieces) : undefined,
        preferredTags: preferredTags ? preferredTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        submissionFee: Number(submissionFee || 0),
        submissionDeadline: deadline || null,
        installWindowStart: installWindowStart || null,
        installWindowEnd: installWindowEnd || null,
        showStart: showStart || null,
        showEnd: showEnd || null,
        maxApplications: maxApplications ? Number(maxApplications) : undefined,
        status: 'open',
      });
      setTitle('');
      setDescription('');
      setWallConstraints('');
      setMaxDimensions('');
      setMaxPieces('');
      setPreferredTags('');
      setPriceMin('');
      setPriceMax('');
      setSubmissionFee('0');
      setDeadline('');
      setInstallWindowStart('');
      setInstallWindowEnd('');
      setShowStart('');
      setShowEnd('');
      setMaxApplications('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to create call');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-2xl mb-4">Calls for Art</h1>

      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <h2 className="text-lg mb-3">Create a call</h2>
        {error && <p className="text-sm text-[var(--danger)] mb-2">{error}</p>}
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
            placeholder="Theme or description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Wall constraints"
              value={wallConstraints}
              onChange={(e) => setWallConstraints(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Max dimensions"
              value={maxDimensions}
              onChange={(e) => setMaxDimensions(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Max pieces"
              value={maxPieces}
              onChange={(e) => setMaxPieces(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Preferred styles/tags (comma separated)"
              value={preferredTags}
              onChange={(e) => setPreferredTags(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Price min (USD)"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Price max (USD)"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              placeholder="Submission fee (USD)"
              value={submissionFee}
              onChange={(e) => setSubmissionFee(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              type="date"
              value={installWindowStart}
              onChange={(e) => setInstallWindowStart(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              type="date"
              value={installWindowEnd}
              onChange={(e) => setInstallWindowEnd(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              type="date"
              value={showStart}
              onChange={(e) => setShowStart(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
              type="date"
              value={showEnd}
              onChange={(e) => setShowEnd(e.target.value)}
            />
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
            placeholder="Max applications"
            value={maxApplications}
            onChange={(e) => setMaxApplications(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]" onClick={createCall}>
            Create Call
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-lg mb-3">Your calls</h2>
        <ul className="space-y-3">
          {calls.map((call) => (
            <li key={call.id} className="flex items-center justify-between border border-[var(--border)] rounded-lg p-3">
              <div>
                <p className="text-sm">{call.title}</p>
                <p className="text-xs text-[var(--text-muted)]">Status: {call.status}</p>
              </div>
              <button className="text-sm text-[var(--accent)] underline" onClick={() => onViewCall(call.id)}>
                View applications
              </button>
            </li>
          ))}
          {calls.length === 0 && <p className="text-xs text-[var(--text-muted)]">No calls yet.</p>}
        </ul>
      </div>
    </div>
  );
}
