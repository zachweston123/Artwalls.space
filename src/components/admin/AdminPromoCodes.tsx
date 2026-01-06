import { useState } from 'react';
import { Plus, Tag, Copy } from 'lucide-react';

interface AdminPromoCodesProps {
  onCreatePromoCode: () => void;
}

export function AdminPromoCodes({ onCreatePromoCode }: AdminPromoCodesProps) {
  const [promos, setPromos] = useState([
    {
      id: '1',
      code: 'WELCOME15',
      discount: '15% off',
      duration: 'Once',
      maxRedemptions: 100,
      redeemedCount: 47,
      expires: '2024-12-31',
      status: 'Active',
    },
    {
      id: '2',
      code: 'SUMMER2024',
      discount: '$10 off',
      duration: '3 months',
      maxRedemptions: null,
      redeemedCount: 12,
      expires: '2024-08-31',
      status: 'Active',
    },
    {
      id: '3',
      code: 'LAUNCH50',
      discount: '50% off',
      duration: 'Forever',
      maxRedemptions: 50,
      redeemedCount: 50,
      expires: null,
      status: 'Inactive',
    },
  ]);
  const [selected, setSelected] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]';
      case 'Inactive':
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]';
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[var(--text)]">Promo Codes</h1>
          <p className="text-[var(--text-muted)]">
            Create and manage subscription discount codes
          </p>
        </div>
        <button
          onClick={onCreatePromoCode}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
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
              {promos.map((promo) => (
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
                  <td className="px-6 py-4 text-sm text-[var(--text)]">{promo.discount}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{promo.duration}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {promo.maxRedemptions || 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {promo.redeemedCount}
                    {promo.maxRedemptions && (
                      <span className="text-[var(--text-muted)]"> / {promo.maxRedemptions}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {promo.expires || 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(promo.status)}`}>
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(promo)} className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors">
                        View
                      </button>
                      {promo.status === 'Active' && (
                        <button onClick={() => setPromos(promos.map(p => p.id === promo.id ? { ...p, status: 'Inactive' } : p))} className="px-3 py-1 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded text-xs hover:bg-[var(--surface-2)] transition-colors">
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

      {promos.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No promo codes yet</h3>
          <p className="text-[var(--text-muted)] mb-6">
            Create your first promo code to offer subscription discounts
          </p>
          <button
            onClick={onCreatePromoCode}
            className="px-6 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
          >
            Create Promo Code
          </button>
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
