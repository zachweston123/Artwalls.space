import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';

interface ReturnCase {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  refund_amount_cents?: number | null;
}

export function AdminReturns() {
  const [cases, setCases] = useState<ReturnCase[]>([]);
  const [selected, setSelected] = useState<ReturnCase | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setLoading(true);
      const res = await apiGet<{ cases: ReturnCase[] }>(`/api/admin/returns${statusFilter ? `?status=${statusFilter}` : ''}`);
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load return cases');
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async (id: string) => {
    try {
      const res = await apiGet<{ case: ReturnCase }>(`/api/admin/returns/${id}`);
      setSelected(res.case);
    } catch (err: any) {
      setError(err?.message || 'Unable to load return case');
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    await apiPost(`/api/admin/returns/${selected.id}/status`, { status });
    await loadCases();
    await loadCase(selected.id);
  };

  const issueRefund = async () => {
    if (!selected) return;
    await apiPost('/api/admin/refund-order', { order_id: selected.order_id, return_case_id: selected.id });
    await loadCases();
    await loadCase(selected.id);
  };

  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <h1 className="text-2xl mb-4">Returns & Disputes</h1>
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
        >
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="needs_more_info">Needs more info</option>
          <option value="approved_return">Approved return</option>
          <option value="rejected">Rejected</option>
          <option value="refund_issued">Refund issued</option>
        </select>
      </div>

      {error && <p className="text-sm text-[var(--danger)] mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {cases.map((c) => (
                <li
                  key={c.id}
                  className="p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] cursor-pointer"
                  onClick={() => loadCase(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{c.reason}</span>
                    <span className="text-xs text-[var(--text-muted)]">{c.status}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Order: {c.order_id}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          {selected ? (
            <div className="space-y-3">
              <h2 className="text-lg">Case details</h2>
              <p className="text-sm text-[var(--text-muted)]">{selected.id}</p>
              <p className="text-sm">Status: {selected.status}</p>
              <div className="flex gap-2 flex-wrap">
                <button className="px-3 py-1 rounded-lg border" onClick={() => updateStatus('needs_more_info')}>Request info</button>
                <button className="px-3 py-1 rounded-lg border" onClick={() => updateStatus('approved_return')}>Approve</button>
                <button className="px-3 py-1 rounded-lg border" onClick={() => updateStatus('rejected')}>Reject</button>
                <button className="px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]" onClick={issueRefund}>Issue refund</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Select a case to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
