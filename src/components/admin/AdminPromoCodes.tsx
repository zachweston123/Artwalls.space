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
        return 'bg-green-100 text-green-700';
      case 'Inactive':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-950">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2 dark:text-neutral-50">Promo Codes</h1>
          <p className="text-neutral-600">
            Create and manage subscription discount codes
          </p>
        </div>
        <button
          onClick={onCreatePromoCode}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Code</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Discount</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Duration</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Max Redemptions</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Redeemed</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Expires</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Status</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {mockPromoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-900 dark:text-neutral-50">{promo.code}</span>
                      <button className="p-1 text-neutral-400 hover:text-neutral-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900">{promo.discount}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{promo.duration}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {promo.maxRedemptions || 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900">
                    {promo.redeemedCount}
                    {promo.maxRedemptions && (
                      <span className="text-neutral-500"> / {promo.maxRedemptions}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {promo.expires || 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(promo.status)}`}>
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-neutral-900 text-white rounded text-xs hover:bg-neutral-800 transition-colors">
                        View
                      </button>
                      {promo.status === 'Active' && (
                        <button className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
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
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No promo codes yet</h3>
          <p className="text-neutral-600 mb-6">
            Create your first promo code to offer subscription discounts
          </p>
          <button
            onClick={onCreatePromoCode}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Create Promo Code
          </button>
        </div>
      )}
    </div>
  );
}
