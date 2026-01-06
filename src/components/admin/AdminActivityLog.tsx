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
      action: 'Reinstated user',
      target: 'jordan.taylor@example.com',
      details: 'Cleared after verification',
    },
  ];

  const getActionColor = (action: string) => {
    if (action.includes('Suspended')) {
      return 'text-[var(--danger)]';
    }
    if (action.includes('Created') || action.includes('Published')) {
      return 'text-[var(--green)]';
    }
    if (action.includes('Deactivated')) {
      return 'text-[var(--warning)]';
    }
    return 'text-[var(--blue)]';
  };

  return (
    <div className="bg-[var(--bg)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Activity Log</h1>
        <p className="text-[var(--text-muted)]">
          Audit trail of all admin actions
        </p>
      </div>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-3)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Admin User</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Action</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Target</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Details</th>
                <th className="text-left px-6 py-3 text-sm text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {mockActivity.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-3)]">
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {log.admin}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {log.target}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {log.details}
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1 text-[var(--blue)] hover:text-[var(--blue-hover)] text-xs transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing 1-{mockActivity.length} of 247 entries
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] rounded hover:bg-[var(--surface-2)] transition-colors text-sm">
              Previous
            </button>
            <button className="px-3 py-1 bg-[var(--blue)] text-[var(--on-blue)] rounded hover:bg-[var(--blue-hover)] transition-colors text-sm">
              Next
            </button>
          </div>
        </div>
      </div>

      {mockActivity.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--surface-3)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-xl mb-2 text-[var(--text)]">No activity yet</h3>
          <p className="text-[var(--text-muted)]">
            Admin actions will appear here
          </p>
        </div>
      )}
    </div>
  );
}
