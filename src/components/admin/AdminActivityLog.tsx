import { Activity } from 'lucide-react';

export function AdminActivityLog() {
  const mockActivity = [
    {
      id: '1',
      timestamp: '2024-01-22 14:32:15',
      admin: 'admin@artwalls.com',
      action: 'Created promo code',
      target: 'WELCOME15',
      details: '15% off for new customers',
    },
    {
      id: '2',
      timestamp: '2024-01-22 13:15:42',
      admin: 'admin@artwalls.com',
      action: 'Published announcement',
      target: 'New Protection Plan Available',
      details: 'Targeted to Artists',
    },
    {
      id: '3',
      timestamp: '2024-01-22 11:20:08',
      admin: 'support@artwalls.com',
      action: 'Suspended user',
      target: 'emma.liu@example.com',
      details: 'Violation of terms',
    },
    {
      id: '4',
      timestamp: '2024-01-22 10:45:33',
      admin: 'support@artwalls.com',
      action: 'Reset password',
      target: 'marcus.r@example.com',
      details: 'User requested password reset',
    },
    {
      id: '5',
      timestamp: '2024-01-22 09:12:17',
      admin: 'admin@artwalls.com',
      action: 'Created promo code',
      target: 'SUMMER2024',
      details: '$10 off, 3 months duration',
    },
    {
      id: '6',
      timestamp: '2024-01-21 16:55:28',
      admin: 'support@artwalls.com',
      action: 'Added note',
      target: 'sarah.chen@example.com',
      details: 'Resolved billing issue',
    },
    {
      id: '7',
      timestamp: '2024-01-21 15:30:41',
      admin: 'admin@artwalls.com',
      action: 'Deactivated promo code',
      target: 'LAUNCH50',
      details: 'Max redemptions reached',
    },
    {
      id: '8',
      timestamp: '2024-01-21 14:22:09',
      admin: 'support@artwalls.com',
      action: 'Unsuspended user',
      target: 'jordan.taylor@example.com',
      details: 'Cleared after verification',
    },
  ];

  const getActionColor = (action: string) => {
    if (action.includes('Suspended')) {
      return 'text-red-600';
    }
    if (action.includes('Created') || action.includes('Published')) {
      return 'text-green-600';
    }
    if (action.includes('Deactivated')) {
      return 'text-orange-600';
    }
    return 'text-blue-600';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Activity Log</h1>
        <p className="text-neutral-600">
          Audit trail of all admin actions
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Admin User</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Action</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Target</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Details</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {mockActivity.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 text-sm text-neutral-600 font-mono">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900">
                    {log.admin}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900 font-mono">
                    {log.target}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {log.details}
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1 text-neutral-600 hover:text-neutral-900 text-xs transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Showing 1-{mockActivity.length} of 247 entries
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200 transition-colors text-sm">
              Previous
            </button>
            <button className="px-3 py-1 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors text-sm">
              Next
            </button>
          </div>
        </div>
      </div>

      {mockActivity.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl mb-2">No activity yet</h3>
          <p className="text-neutral-600">
            Admin actions will appear here
          </p>
        </div>
      )}
    </div>
  );
}
