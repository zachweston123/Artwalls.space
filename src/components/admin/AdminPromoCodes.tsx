import { useEffect, useMemo, useState } from 'react';
import { Plus, Tag, Copy, RefreshCw } from 'lucide-react';
import { PageHeroHeader } from '../PageHeroHeader';
import { apiGet, apiPost } from '../../lib/api';

type PromoStatus = 'active' | 'inactive' | 'expired';

type PromoCode = {
  id: string;
  code: string;
  discountLabel: string;
  duration: string;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  status: PromoStatus;
};

async function fetchPromoCodes(): Promise<PromoCode[]> {
  try {
    const data = await apiGet<any>('/api/admin/promo-codes');
    return (data?.promoCodes || data || []).map((p: any) => ({
      id: String(p.id),
      code: p.code,
      discountLabel: p.discountLabel ?? p.discount ?? '',
      duration: p.duration ?? '—',
      maxRedemptions: p.maxRedemptions ?? p.max_redemptions ?? null,
      redeemedCount: p.redeemedCount ?? p.redeemed_count ?? 0,
      expiresAt: p.expiresAt ?? p.expires ?? p.expires_at ?? null,
      status: (p.status?.toLowerCase?.() as PromoStatus) ?? 'active',
    }));
  } catch {
    // Endpoint may not exist yet — return empty
    return [];
  }
}

async function deactivatePromoCode(id: string) {
  await apiPost(`/api/admin/promo-codes/${id}/deactivate`, {});
}

export function AdminPromoCodes() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [selected, setSelected] = useState<PromoCode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const latest = await fetchPromoCodes();
      setPromos(latest);
    } catch (err: any) {
      setError(err?.message || 'Unable to load promo codes');
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'expired':
        return 'bg-[var(--surface-3)] text-[var(--warning)] border border-[var(--border)]';
      case 'inactive':
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  const sortedPromos = useMemo(
    () => [...promos].sort((a, b) => a.code.localeCompare(b.code)),
    [promos]
  );

  const handleDeactivate = async (id: string) => {
    try {
      setDeactivatingId(id);
      await deactivatePromoCode(id);
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'inactive' } : p)));
    } catch (err: any) {
      setError(err?.message || 'Unable to deactivate code');
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <PageHeroHeader
        title="Promo Codes"
        subtitle="Create and manage subscription discount codes"
        actions={
          <a
            href="https://dashboard.stripe.com/promotions"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Open Stripe Promo Codes
          </a>
        }
      />

      <div className="flex items-center gap-3 mb-4 text-sm text-[var(--text-muted)]">
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {loading && <span>Loading promo codes…</span>}
        {error && <span className="text-[var(--danger)]">{error}</span>}
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Code</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Discount</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Duration</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Max Redemptions</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Redeemed</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Expires</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Status</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedPromos.map((promo) => (
                <tr key={promo.id} className="hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text)]">{promo.code}</span>
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]" onClick={() => { navigator.clipboard.writeText(promo.code); setCopiedId(promo.id); setTimeout(() => setCopiedId(null), 1500); }}>
                        <Copy className="w-3 h-3" />
                      </button>
                      {copiedId === promo.id && <span className="text-xs text-[var(--green)]">Copied</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">{promo.discountLabel || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{promo.duration || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {promo.maxRedemptions ?? 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {promo.redeemedCount}
                    {promo.maxRedemptions && (
                      <span className="text-[var(--text-muted)]"> / {promo.maxRedemptions}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {promo.expiresAt || 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(promo.status)}`}>
                      {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(promo)} className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors">
                        View
                      </button>
                      {promo.status === 'active' && (
                        <button onClick={() => handleDeactivate(promo.id)} disabled={deactivatingId === promo.id} className="px-3 py-1 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded text-xs hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60">
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && promos.length === 0 && !error && (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No promo codes yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Create your first promo code to offer subscription discounts
          </p>
          <a
            href="https://dashboard.stripe.com/promotions"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Create in Stripe
          </a>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-[var(--text)]">Promo Code Details</h3>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Code:</strong> {selected.code}</div>
              <div><strong>Discount:</strong> {selected.discount}</div>
              <div><strong>Duration:</strong> {selected.duration}</div>
              <div><strong>Expires:</strong> {selected.expires || 'Never'}</div>
              <div><strong>Status:</strong> {selected.status}</div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setSelected(null)} className="px-4 py-2 bg-[var(--surface-2)] rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
