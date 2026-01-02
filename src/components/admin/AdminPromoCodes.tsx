import { useState } from 'react';
import { Plus, Tag, Copy } from 'lucide-react';

interface AdminPromoCodesProps {
  onCreatePromoCode: () => void;
}

export function AdminPromoCodes({ onCreatePromoCode }: AdminPromoCodesProps) {
  const mockPromoCodes = [
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
  ];

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
              {mockPromoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text)]">{promo.code}</span>
                      <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]">
                        <Copy className="w-3 h-3" />
                      </button>
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
                      <button className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded text-xs hover:bg-[var(--blue-hover)] transition-colors">
                        View
                      </button>
                      {promo.status === 'Active' && (
                        <button className="px-3 py-1 bg-[var(--surface-3)] text-[var(--danger)] border border-[var(--border)] rounded text-xs hover:bg-[var(--surface-2)] transition-colors">
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

      {mockPromoCodes.length === 0 && (
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
    </div>
  );
}
